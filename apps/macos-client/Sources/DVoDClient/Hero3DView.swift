import SceneKit
import SwiftUI

/// Started as a port of apps/web/src/components/HeroPolyhedron.tsx (an
/// icosahedron wireframe with pulsing vertex dots, single flat --primary color -
/// no gradient, no glow, same note as the web component). Now denser (one level
/// of geodesic subdivision - more triangles, more edges, more vertices/dots) and
/// tumbling on all three axes at random per-launch rates instead of spinning on
/// just Y, per later feedback asking for more edges and a fuller 360 spin.
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

        // A different, randomly-chosen rate and direction per axis each launch -
        // since the three rates share no common period, the combined tumble
        // never repeats the same orientation on a predictable cycle, reading as
        // a full, random-looking 360 spin rather than a flat single-axis one.
        private let rateX = Double.random(in: 0.09...0.21) * (Bool.random() ? 1 : -1)
        private let rateY = Double.random(in: 0.09...0.21) * (Bool.random() ? 1 : -1)
        private let rateZ = Double.random(in: 0.09...0.21) * (Bool.random() ? 1 : -1)

        func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
            let delta = lastTime.map { time - $0 } ?? 0
            lastTime = time
            group?.eulerAngles.x += CGFloat(delta * rateX)
            group?.eulerAngles.y += CGFloat(delta * rateY)
            group?.eulerAngles.z += CGFloat(delta * rateZ)
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

        let radius: Float = 1.7

        // Base icosahedron: three.js's IcosahedronGeometry construction - 12
        // golden-ratio vertices, 20 triangular faces.
        let phi: Float = (1 + sqrt(5)) / 2
        let raw: [(Float, Float, Float)] = [
            (-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0),
            (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi),
            (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1),
        ]
        var vertices: [SCNVector3] = raw.map { x, y, z in
            let len = sqrt(x * x + y * y + z * z)
            return SCNVector3(x / len * radius, y / len * radius, z / len * radius)
        }
        var faces: [[Int32]] = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
        ]

        // One geodesic subdivision - each triangle splits into 4 (midpoints
        // pushed back out to the sphere), taking 12 vertices/20 faces/30 edges
        // to 42 vertices/80 faces/120 edges. More edges, same shape.
        (vertices, faces) = subdivide(vertices: vertices, faces: faces, radius: radius)

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
        let dotRadius = 0.03 * Double(radius / 2.52) // smaller than before - there are ~3.5x as many now
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

    private static func subdivide(
        vertices: [SCNVector3],
        faces: [[Int32]],
        radius: Float,
    ) -> ([SCNVector3], [[Int32]]) {
        var newVertices = vertices
        var midpointCache: [String: Int32] = [:]

        func midpoint(_ a: Int32, _ b: Int32) -> Int32 {
            let key = a < b ? "\(a)_\(b)" : "\(b)_\(a)"
            if let cached = midpointCache[key] { return cached }
            let va = newVertices[Int(a)]
            let vb = newVertices[Int(b)]
            let mx = Float((va.x + vb.x) / 2)
            let my = Float((va.y + vb.y) / 2)
            let mz = Float((va.z + vb.z) / 2)
            let len = sqrt(mx * mx + my * my + mz * mz)
            let index = Int32(newVertices.count)
            newVertices.append(SCNVector3(mx / len * radius, my / len * radius, mz / len * radius))
            midpointCache[key] = index
            return index
        }

        var newFaces: [[Int32]] = []
        for face in faces {
            let a = face[0], b = face[1], c = face[2]
            let ab = midpoint(a, b)
            let bc = midpoint(b, c)
            let ca = midpoint(c, a)
            newFaces.append([a, ab, ca])
            newFaces.append([b, bc, ab])
            newFaces.append([c, ca, bc])
            newFaces.append([ab, bc, ca])
        }
        return (newVertices, newFaces)
    }
}
