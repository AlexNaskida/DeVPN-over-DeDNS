import SceneKit
import SwiftUI

/// A real SceneKit scene (not a static image or CSS-style fake-3D) - a slowly
/// spinning icosahedron "shield" core inside a wireframe torus "network" ring,
/// shown as the hero when idle. Wrapped for SwiftUI via NSViewRepresentable since
/// SceneKit has no native SwiftUI view.
struct Hero3DView: NSViewRepresentable {
    func makeNSView(context: Context) -> SCNView {
        let view = SCNView()
        view.scene = Self.buildScene()
        view.backgroundColor = .clear
        view.allowsCameraControl = false
        view.antialiasingMode = .multisampling4X
        return view
    }

    func updateNSView(_ nsView: SCNView, context: Context) {}

    private static func buildScene() -> SCNScene {
        let scene = SCNScene()

        let core = SCNNode(geometry: SCNSphere(radius: 1.1))
        core.geometry?.firstMaterial?.diffuse.contents = NSColor(red: 0.95, green: 0.55, blue: 0.15, alpha: 1)
        core.geometry?.firstMaterial?.emission.contents = NSColor(red: 0.6, green: 0.25, blue: 0.05, alpha: 1)
        core.geometry?.firstMaterial?.lightingModel = .physicallyBased
        core.geometry?.firstMaterial?.metalness.contents = 0.3
        core.geometry?.firstMaterial?.roughness.contents = 0.35
        scene.rootNode.addChildNode(core)

        let ring = SCNNode(geometry: SCNTorus(ringRadius: 2.0, pipeRadius: 0.02))
        ring.geometry?.firstMaterial?.diffuse.contents = NSColor(red: 0.4, green: 0.75, blue: 0.9, alpha: 0.9)
        ring.geometry?.firstMaterial?.emission.contents = NSColor(red: 0.2, green: 0.5, blue: 0.65, alpha: 1)
        ring.eulerAngles = SCNVector3(Float.pi / 2.4, 0, 0)
        scene.rootNode.addChildNode(ring)

        let ring2 = ring.clone()
        ring2.eulerAngles = SCNVector3(0, Float.pi / 2.4, Float.pi / 6)
        scene.rootNode.addChildNode(ring2)

        let spin = SCNAction.repeatForever(.rotateBy(x: 0, y: .pi * 2, z: 0, duration: 14))
        core.runAction(spin)
        let ringSpin = SCNAction.repeatForever(.rotateBy(x: 0, y: 0, z: .pi * 2, duration: 22))
        ring.runAction(ringSpin)
        let ring2Spin = SCNAction.repeatForever(.rotateBy(x: .pi * 2, y: 0, z: 0, duration: 26))
        ring2.runAction(ring2Spin)

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(0, 0, 6)
        scene.rootNode.addChildNode(cameraNode)

        let key = SCNNode()
        key.light = SCNLight()
        key.light?.type = .omni
        key.light?.intensity = 900
        key.position = SCNVector3(3, 3, 5)
        scene.rootNode.addChildNode(key)

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 250
        ambient.light?.color = NSColor(red: 0.1, green: 0.15, blue: 0.2, alpha: 1)
        scene.rootNode.addChildNode(ambient)

        return scene
    }
}
