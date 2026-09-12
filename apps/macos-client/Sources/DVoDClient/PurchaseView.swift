import SwiftUI

/// UI-only: this app has no wallet/signing access (see WalletState.swift), so
/// there is no real purchase flow here - "Buy in Web App" just opens the web
/// app, where buying a session actually happens today. Shown so the shape of
/// in-app purchasing is present for the demo narrative, without pretending a
/// native payment flow exists yet.
struct PurchaseView: View {
    @State private var selectedTier: Tier?
    @State private var hours: Double = 1

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Purchase a session")
                        .font(.system(size: 22, weight: .bold))
                    Text("Pricing mirrors packages/session-spec. Buying still happens in the web app for now - it needs a browser wallet (MetaMask) to sign the on-chain payment, which this native app can't access directly.")
                        .font(.system(size: 12))
                        .foregroundStyle(Tokens.mutedForeground)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(alignment: .top, spacing: 28) {
                    ForEach(Tier.allCases) { tier in
                        tierCard(tier)
                    }
                }
                // Room for the selected card growing taller so it doesn't clip
                // against the content above/below.
                .padding(.vertical, 14)

                hoursControl

                HStack {
                    Spacer()
                    Button(action: WalletState.openWebApp) {
                        Text(selectedTier == nil ? "Select a plan" : "Buy in Web App")
                            .padding(.horizontal, 6)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(Tokens.primary)
                    .disabled(selectedTier == nil)
                    Spacer()
                }
            }
            .padding(28)
        }
    }

    private func tierCard(_ tier: Tier) -> some View {
        let isSelected = selectedTier == tier
        // Grows ~10% via layout (padding/height/font), not a scaleEffect
        // transform - scaleEffect ignores layout and grew straight into the
        // neighboring card instead of making room for itself.
        let cardPadding: CGFloat = isSelected ? 20 : 18
        let minHeight: CGFloat = isSelected ? 121 : 110
        let titleSize: CGFloat = isSelected ? 17.5 : 16
        let priceSize: CGFloat = isSelected ? 20 : 18

        return VStack(alignment: .leading, spacing: 10) {
            Text(tier.displayName)
                .font(.system(size: titleSize, weight: .semibold))
            Text(tier.summary)
                .font(.system(size: 12))
                .foregroundStyle(Tokens.mutedForeground)
            Spacer(minLength: 12)
            Text("$\(String(format: "%.2f", tier.pricePerHourUsdc))/hr")
                .font(.system(size: priceSize, weight: .bold, design: .monospaced))
                .foregroundStyle(isSelected ? Tokens.primary : Tokens.foreground)
        }
        .padding(cardPadding)
        .frame(maxWidth: .infinity, minHeight: minHeight, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Tokens.card)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(isSelected ? Tokens.primary : Tokens.border, lineWidth: isSelected ? 2 : 1),
                ),
        )
        .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isSelected)
        .contentShape(RoundedRectangle(cornerRadius: 12))
        .onTapGesture {
            selectedTier = tier
        }
    }

    private var hoursControl: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Session duration")
                    .font(.system(size: 13, weight: .semibold))
                Spacer()
                Text("\(Int(hours))h")
                    .font(.system(size: 13, weight: .semibold, design: .monospaced))
                    .foregroundStyle(Tokens.primary)
            }
            Slider(value: $hours, in: 1...24, step: 1)
                .tint(Tokens.primary)
            if let selectedTier {
                Text("Total: $\(String(format: "%.2f", selectedTier.pricePerHourUsdc * hours)) for \(Int(hours))h")
                    .font(.system(size: 12))
                    .foregroundStyle(Tokens.mutedForeground)
            }
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
