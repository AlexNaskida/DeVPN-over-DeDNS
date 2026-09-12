import SwiftUI

struct SidebarView: View {
    @ObservedObject var state: AppState

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                if let logo = NSImage(named: "DashboardLogo") {
                    Image(nsImage: logo)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 26, height: 26)
                }
                Text("DVoD")
                    .font(.system(size: 17, weight: .bold))
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 12)

            VStack(spacing: 2) {
                ForEach(SidebarSection.allCases) { section in
                    sidebarRow(section)
                }
            }
            .padding(.horizontal, 10)

            Spacer()

            Divider()
            Button(action: WalletState.openWebApp) {
                HStack(spacing: 8) {
                    Image(systemName: "wallet.pass")
                    Text("Connect Wallet")
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(Tokens.mutedForeground)
            .padding(14)
        }
        .frame(width: 200)
        .background(Tokens.card)
    }

    private func sidebarRow(_ section: SidebarSection) -> some View {
        let selected = state.selectedSection == section
        return Button {
            state.selectedSection = section
        } label: {
            HStack(spacing: 10) {
                Image(systemName: section.systemImage)
                    .frame(width: 18)
                Text(section.rawValue)
                    .font(.system(size: 13, weight: selected ? .semibold : .regular))
                Spacer()
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(selected ? Tokens.primary.opacity(0.18) : Color.clear)
            .foregroundStyle(selected ? Tokens.primary : Tokens.foreground.opacity(0.85))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}
