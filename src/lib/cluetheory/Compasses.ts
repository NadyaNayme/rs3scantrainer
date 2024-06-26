import {TileCoordinates} from "../runescape/coordinates";
import {Transform, Vector2} from "../math";
import {posmod} from "../../skillbertssolver/util";
import {CompassReader} from "../../trainer/ui/neosolving/cluereader/CompassReader";
import {TileArea} from "../runescape/coordinates/TileArea";

export namespace Compasses {

  export type TriangulationPoint = {
    position: TileArea.ActiveTileArea,
    angle_radians: number,
    direction: Vector2,
    uncertainty_origin: Vector2,
    uncertainty: number
  }

  export namespace TriangulationPoint {
    export function construct(position: TileArea.ActiveTileArea, angle: number): TriangulationPoint {

      const direction_vector = Vector2.transform(Compasses.ANGLE_REFERENCE_VECTOR, Transform.rotationRadians(angle))

      const uncertainty = Vector2.length(position.size) / 2

      const l = uncertainty / Math.tan(CompassReader.EPSILON)

      const uncertainty_origin = Vector2.sub(position.center(), Vector2.scale(l, direction_vector))

      return {
        position: position,
        angle_radians: angle,
        direction: direction_vector,
        uncertainty_origin: uncertainty_origin,
        uncertainty: uncertainty
      }
    }
  }

  export const ANGLE_REFERENCE_VECTOR = {x: 1, y: 0}

  export function angleDifference(a: number, b: number) {
    return Math.abs(posmod(b - a + Math.PI, 2 * Math.PI) - Math.PI);
  }

  /**
   * Gets the expected compass angle for a given player spot and a target compass spot in radians
   * @param position
   * @param spot
   */
  export function getExpectedAngle(position: Vector2, spot: Vector2): number {
    const offset = Vector2.normalize(Vector2.sub(spot, position))

    const a = ANGLE_REFERENCE_VECTOR
    const b = offset

    const res = Math.atan2(Vector2.det(a, b), Vector2.dot(a, b))

    if (res < 0) return res + 2 * Math.PI
    else return res
  }

  export function isPossible(information: TriangulationPoint[], spot: TileCoordinates): boolean {
    return information.every(i =>
      Math.abs(angleDifference(getExpectedAngle(i.uncertainty_origin, spot), i.angle_radians)) < CompassReader.EPSILON
    )
  }
}