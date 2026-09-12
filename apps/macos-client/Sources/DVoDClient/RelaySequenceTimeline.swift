import SwiftUI

/// Ports apps/web/src/components/RelaySequenceTimeline.tsx's look to the native
/// dashboard - a horizontal strip of steps, each filling solid with a checkmark
/// once done, the current one pulsing, the rest outlined. Driven by
/// AppState.connectStep, which AppDelegate.connect() sets right before doing the
/// real work each step names - this tracks actual progress, not a canned
/// animation, even though the whole sequence usually finishes in well under a
/// second.
struct RelaySequenceTimeline: View {
    let currentStep: ConnectStep?

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            // (Steps have a fixed width; only the connector lines between them
            // stretch to fill the card - see RelaySequenceTimeline's frame below.)
            ForEach(ConnectStep.allCases, id: \.self) { step in
                let status = Self.status(for: step, currentStep: currentStep)
                HStack(alignment: .top, spacing: 0) {
                    VStack(spacing: 8) {
                        StepDot(status: status)
                        Text(step.label)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(status == .pending ? Tokens.mutedForeground : Tokens.foreground)
                            .multilineTextAlignment(.center)
                            .frame(width: 84)
                    }
                    if step != ConnectStep.allCases.last {
                        Rectangle()
                            .fill(status == .done ? Tokens.primary : Tokens.border)
                            .frame(maxWidth: .infinity)
                            .frame(height: 2)
                            .padding(.top, 13)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity)
    }

    private static func status(for step: ConnectStep, currentStep: ConnectStep?) -> StepStatus {
        guard let currentStep else { return .pending }
        if step.rawValue < currentStep.rawValue { return .done }
        if step == currentStep { return currentStep == .connected ? .done : .current }
        return .pending
    }
}

private enum StepStatus {
    case done, current, pending
}

private struct StepDot: View {
    let status: StepStatus

    var body: some View {
        ZStack {
            switch status {
            case .done:
                Circle().fill(Tokens.primary)
                Image(systemName: "checkmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white)
            case .current:
                Circle().strokeBorder(Tokens.primary, lineWidth: 2)
                Circle().fill(Tokens.primary).frame(width: 10, height: 10)
                    .scaleEffect(pulse ? 1.15 : 0.85)
                    .opacity(pulse ? 1 : 0.6)
                    .animation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true), value: pulse)
                    .onAppear { pulse = true }
            case .pending:
                Circle().strokeBorder(Tokens.border, lineWidth: 2)
            }
        }
        .frame(width: 26, height: 26)
    }

    @State private var pulse = false
}
