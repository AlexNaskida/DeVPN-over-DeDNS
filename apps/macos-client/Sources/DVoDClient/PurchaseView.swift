import SwiftUI

/// UI-only: this app has no wallet/signing access (see WalletState.swift), so
/// there is no real purchase flow here - each tier's button just opens the web
/// app, where buying a session actually happens today. Shown so the shape of
/// in-app purchasing is present for the demo narrative, without pretending a
/// native payment flow exists yet.
struct PurchaseView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Purchase a session")
                        .font(.system(size: 22, weight: .bold))
                    Text("Pricing mirrors packages/session-spec. Buying still happens in the web app for now - it needs a browser wallet (MetaMask) to sign the on-chain payment, which this native app can't access directly.")
                        .font(.system(size: 12))
                        .foregroundStyle(Tokens.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }

                ForEach(Tier.allCases) { tier in
                    tierCard(tier)
                }
            }
            .padding(28)
        }
    }

    private func tierCard(_ tier: Tier) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(tier.displayName)
                    .font(.system(size: 16, weight: .semibold))
                Text(tier.summary)
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.mutedForeground)
            }
            Spacer()
            Text("$\(String(format: "%.2f", tier.pricePerHourUsdc))/hr")
                .font(.system(size: 14, weight: .medium, design: .monospaced))
            Button("Buy in Web App", action: WalletState.openWebApp)
                .buttonStyle(.borderedProminent)
                .tint(Tokens.primary)
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Tokens.card)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Tokens.border, lineWidth: 1),
                ),
        )
    }
}
