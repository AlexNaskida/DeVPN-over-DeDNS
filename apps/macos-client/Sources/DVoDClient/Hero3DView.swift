import SceneKit
import SwiftUI

/// Ports apps/web/src/components/HeroPolyhedron.tsx to SceneKit for the native
/// dashboard: the same icosahedron wireframe with pulsing vertex dots, the same
/// single flat --primary color (no gradient, no glow - same note as the web
/// component), the same rotation-speed and per-vertex pulse formulas. Not a
/// different, invented 3D design.
struct Hero3DView: NSViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeNSView(context: Context) -> SCNView {
        let view = SCNView()
        let (scene, group, dots) = Self.buildScene()
        view.scene = scene
        view.backgroundColor = .clear
        view.antialiasingMode = .multisampling4X
        context.coordinator.group = group
        context.coordinator.dots = dots
        view.delegate = context.coordinator
        view.isPlaying = true
        return view
    }

    func updateNSView(_ nsView: SCNView, context: Context) {}

    final class Coordinator: NSObject, SCNSceneRendererDelegate {
        var group: SCNNode?
        var dots: [SCNNode] = []
        private var lastTime: TimeInterval?

        // Mirrors HeroPolyhedron's useFrame: group.rotation.y += delta * 0.1, and
        // each dot's scale = 1 + sin(t * 1.6 + i * 0.7) * 0.35.
        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            let delta = lastTime.map { time - $0 } ?? 0
            lastTime = time
            group?.eulerAngles.y += CGFloat(delta * 0.1)
            for (i, dot) in dots.enumerated() {
                let scale = CGFloat(1 + sin(time * 1.6 + Double(i) * 0.7) * 0.35)
                dot.scale = SCNVector3(scale, scale, scale)
            }
        }
    }

    private static func buildScene() -> (SCNScene, SCNNode, [SCNNode]) {
        let scene = SCNScene()
        let group = SCNNode()
        scene.rootNode.addChildNode(group)

        // Same icosahedron construction as three.js's IcosahedronGeometry: 12
        // golden-ratio vertices, 20 triangular faces, edges de-duplicated from
        // those faces.
        let radius: Float = 1.7
        let phi: Float = (1 + sqrt(5)) / 2
        let raw: [(Float, Float, Float)] = [
            (-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0),
            (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi),
            (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1),
        ]
        let vertices: [SCNVector3] = raw.map { x, y, z in
            let len = sqrt(x * x + y * y + z * z)
            return SCNVector3(x / len * radius, y / len * radius, z / len * radius)
        }

        let faces: [[Int32]] = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
        ]
        var edgeSet = Set<[Int32]>()
        for face in faces {
            for pair in [[face[0], face[1]], [face[1], face[2]], [face[2], face[0]]] {
                edgeSet.insert(pair.sorted())
            }
        }
        let edgeIndices = edgeSet.flatMap { $0 }

        let primary = NSColor(Tokens.primary)

        let source = SCNGeometrySource(vertices: vertices)
        let element = SCNGeometryElement(indices: edgeIndices, primitiveType: .line)
        let wireframe = SCNGeometry(sources: [source], elements: [element])
        let lineMaterial = SCNMaterial()
        lineMaterial.diffuse.contents = primary
        lineMaterial.lightingModel = .constant // unlit, matching lineBasicMaterial
        lineMaterial.transparency = 0.5 // matches the web component's opacity: 0.5
        wireframe.materials = [lineMaterial]
        group.addChildNode(SCNNode(geometry: wireframe))

        var dots: [SCNNode] = []
        let dotRadius = 0.045 * Double(radius / 2.52) // same proportion as the web version's 0.045 at radius 2.52
        for vertex in vertices {
            let dotGeometry = SCNSphere(radius: dotRadius)
            let dotMaterial = SCNMaterial()
            dotMaterial.diffuse.contents = primary
            dotMaterial.lightingModel = .constant // unlit, matching meshBasicMaterial
            dotGeometry.firstMaterial = dotMaterial
            let node = SCNNode(geometry: dotGeometry)
            node.position = vertex
            group.addChildNode(node)
            dots.append(node)
        }

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.camera?.fieldOfView = 45
        cameraNode.position = SCNVector3(0, 0, 4.9)
        scene.rootNode.addChildNode(cameraNode)

        return (scene, group, dots)
    }
}
