// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @notice Holds session-purchase funds on Arc. USDC is Arc's native gas/value token
///         (18 decimals) — see docs.arc.io/arc/references/connect-to-arc — so payment
///         here is a plain native-value transaction, not an ERC-20 approve/transferFrom.
///
///         Per brief §2.1/§2.4: a batched per-session purchase, never per-packet or
///         per-DNS-query. `purchaseSession` is the one on-chain transaction per
///         session; which relay actually serves it is an off-chain orchestrator
///         decision (ENSv2 discovery), not tracked here. `payoutOperator` disburses
///         accumulated revenue to an operator's `payout_address` (see
///         packages/identity/ens capability record) — a separate admin action, not
///         tied 1:1 to any single session.
contract SessionEscrow {
    enum Tier {
        Lite,
        Standard,
        Turbo
    }

    struct Session {
        address payer;
        Tier tier;
        uint256 hours_;
        uint256 paidAmount;
        uint64 purchasedAt;
        bool refunded;
    }

    /// @dev Illustrative flat rate, matching packages/session-spec/src/tier.ts
    ///      exactly — not an economically modeled rate card, tune before demo.
    uint256 internal constant LITE_RATE_PER_HOUR = 0.1 ether; // $0.10/hr, 18 decimals
    uint256 internal constant STANDARD_RATE_PER_HOUR = 0.35 ether; // $0.35/hr
    uint256 internal constant TURBO_RATE_PER_HOUR = 1 ether; // $1.00/hr

    uint256 public constant MAX_HOURS = 24;

    address public immutable ADMIN;

    uint256 public nextSessionId;
    mapping(uint256 => Session) public sessions;

    event SessionPurchased(
        uint256 indexed sessionId,
        address indexed payer,
        Tier tier,
        uint256 hours_,
        uint256 paidAmount
    );
    event OperatorPaidOut(address indexed relayPayoutAddress, uint256 amount);
    event SessionRefunded(uint256 indexed sessionId, address indexed payer, uint256 amount);

    error InvalidHours(uint256 hours_);
    error IncorrectPayment(uint256 required, uint256 provided);
    error SessionNotFound(uint256 sessionId);
    error SessionAlreadyRefunded(uint256 sessionId);
    error InsufficientEscrowBalance(uint256 requested, uint256 available);
    error NotAdmin(address caller);
    error TransferFailed();

    modifier onlyAdmin() {
        _checkOnlyAdmin();
        _;
    }

    constructor(address admin_) {
        ADMIN = admin_;
    }

    function _checkOnlyAdmin() internal view {
        if (msg.sender != ADMIN) revert NotAdmin(msg.sender);
    }

    /// @notice `session_price(tier, hours) = tier_base_rate_per_hour(tier) * hours`,
    ///         per brief §2.4.
    function price(Tier tier, uint256 hours_) public pure returns (uint256) {
        return _ratePerHour(tier) * hours_;
    }

    /// @notice Pays for a time-boxed session. A real, batched, per-session Arc
    ///         transaction — never per-packet or per-DNS-query.
    /// @return sessionId The purchased session's id.
    function purchaseSession(Tier tier, uint256 hours_)
        external
        payable
        returns (uint256 sessionId)
    {
        if (hours_ == 0 || hours_ > MAX_HOURS) revert InvalidHours(hours_);

        uint256 required = price(tier, hours_);
        if (msg.value != required) revert IncorrectPayment(required, msg.value);

        sessionId = nextSessionId++;
        sessions[sessionId] = Session({
            payer: msg.sender,
            tier: tier,
            hours_: hours_,
            paidAmount: msg.value,
            purchasedAt: uint64(block.timestamp),
            refunded: false
        });

        emit SessionPurchased(sessionId, msg.sender, tier, hours_, msg.value);
    }

    /// @notice Disburses accumulated revenue to a relay operator's payout address.
    ///         Not tied to a single session — see contract-level note.
    function payoutOperator(address relayPayoutAddress, uint256 amount) external onlyAdmin {
        if (amount > address(this).balance) {
            revert InsufficientEscrowBalance(amount, address(this).balance);
        }
        (bool ok,) = relayPayoutAddress.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit OperatorPaidOut(relayPayoutAddress, amount);
    }

    /// @notice Refunds a session that never actually opened a tunnel (e.g. the
    ///         chosen relay went unreachable before the tunnel opened). Admin-only —
    ///         the orchestrator is the one that knows a tunnel never opened.
    function refundSession(uint256 sessionId) external onlyAdmin {
        Session storage session = sessions[sessionId];
        if (session.payer == address(0)) revert SessionNotFound(sessionId);
        if (session.refunded) revert SessionAlreadyRefunded(sessionId);

        session.refunded = true;
        (bool ok,) = session.payer.call{value: session.paidAmount}("");
        if (!ok) revert TransferFailed();

        emit SessionRefunded(sessionId, session.payer, session.paidAmount);
    }

    function _ratePerHour(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Lite) return LITE_RATE_PER_HOUR;
        if (tier == Tier.Standard) return STANDARD_RATE_PER_HOUR;
        return TURBO_RATE_PER_HOUR;
    }
}
