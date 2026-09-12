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

    private static let dotSize: CGFloat = 30 // 26 * 1.15, rounded
    private static let lineThickness: CGFloat = 3

    var body: some View {
        // Dots and connectors sized only by the dot (not the wider label below),
        // so the line touches each dot's edge exactly with no gap. Labels are
        // overlaid underneath instead of sharing this row's width. A leading and
        // trailing segment (touching this view's own left/right edges) bookend
        // the row so the line reaches the container's border on both ends, not
        // just the first/last dot.
        HStack(alignment: .top, spacing: 0) {
            edgeSegment(color: firstStepColor)

            ForEach(ConnectStep.allCases, id: \.self) { step in
                let status = Self.status(for: step, currentStep: currentStep)
                StepDot(status: status, size: Self.dotSize)
                    .overlay(alignment: .top) {
                        Text(step.label)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(status == .pending ? Tokens.mutedForeground : Tokens.foreground)
                            .multilineTextAlignment(.center)
                            .frame(width: 100)
                            .fixedSize(horizontal: false, vertical: true)
                            .offset(y: Self.dotSize + 8)
                    }
                if step != ConnectStep.allCases.last {
                    // Flexible - these fill the space between dots, spreading
                    // the whole sequence across the container's full width.
                    connectorLine(color: status == .done ? Tokens.primary : Tokens.border)
                        .frame(maxWidth: .infinity)
                }
            }

            edgeSegment(color: lastStepColor)
        }
        .frame(maxWidth: .infinity)
        .padding(.bottom, 36) // room for the overlaid labels below the dot row
    }

    /// A short, fixed-width segment - just enough to visibly reach this view's
    /// own left/right edge, not something that should compete for the flexible
    /// space the between-dot connectors need.
    private func edgeSegment(color: Color) -> some View {
        connectorLine(color: color).frame(width: 40)
    }

    private func connectorLine(color: Color) -> some View {
        Rectangle()
            .fill(color)
            .frame(height: Self.lineThickness)
            .padding(.top, (Self.dotSize - Self.lineThickness) / 2)
    }

    private var firstStepColor: Color {
        Self.status(for: .verifying, currentStep: currentStep) == .pending ? Tokens.border : Tokens.primary
    }

    private var lastStepColor: Color {
        Self.status(for: .connected, currentStep: currentStep) == .done ? Tokens.primary : Tokens.border
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
    let size: CGFloat

    var body: some View {
        ZStack {
            switch status {
            case .done:
                Circle().fill(Tokens.primary)
                Image(systemName: "checkmark")
                    .font(.system(size: size * 0.42, weight: .bold))
                    .foregroundStyle(.white)
            case .current:
                Circle().strokeBorder(Tokens.primary, lineWidth: 2)
                Circle().fill(Tokens.primary).frame(width: size * 0.38, height: size * 0.38)
                    .scaleEffect(pulse ? 1.15 : 0.85)
                    .opacity(pulse ? 1 : 0.6)
                    .animation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true), value: pulse)
                    .onAppear { pulse = true }
            case .pending:
                Circle().strokeBorder(Tokens.border, lineWidth: 2)
            }
        }
        .frame(width: size, height: size)
    }

    @State private var pulse = false
}
