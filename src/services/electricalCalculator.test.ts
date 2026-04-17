import { describe, expect, it } from 'vitest'
import { ElectricalCalculator } from './electricalCalculator'

describe('ElectricalCalculator', () => {
  it('returns coherent sizing for regular residential load', () => {
    const calculator = new ElectricalCalculator()
    const result = calculator.calculateFromPower({
      powerWatts: 2200,
      distanceMeters: 25,
      voltage: 220,
      installationMethod: 'B1',
      material: 'copper',
    })

    expect(result.currentA).toBeCloseTo(10, 1)
    expect(result.sectionMm2).toBeGreaterThanOrEqual(1.5)
    expect(result.breakerA).toBeGreaterThanOrEqual(10)
    expect(result.voltageDropPercent).toBeLessThanOrEqual(4)
  })

  it('demands larger section when distance grows significantly', () => {
    const calculator = new ElectricalCalculator()
    const shortRoute = calculator.calculateFromPower({
      powerWatts: 3000,
      distanceMeters: 10,
      voltage: 220,
      installationMethod: 'B1',
      material: 'copper',
    })
    const longRoute = calculator.calculateFromPower({
      powerWatts: 3000,
      distanceMeters: 80,
      voltage: 220,
      installationMethod: 'B1',
      material: 'copper',
    })

    expect(longRoute.sectionMm2).toBeGreaterThanOrEqual(shortRoute.sectionMm2)
  })

  it('aluminum tends to require same or larger section than copper', () => {
    const calculator = new ElectricalCalculator()
    const copper = calculator.calculateFromPower({
      powerWatts: 3500,
      distanceMeters: 30,
      voltage: 220,
      installationMethod: 'B2',
      material: 'copper',
    })
    const aluminum = calculator.calculateFromPower({
      powerWatts: 3500,
      distanceMeters: 30,
      voltage: 220,
      installationMethod: 'B2',
      material: 'aluminum',
    })

    expect(aluminum.sectionMm2).toBeGreaterThanOrEqual(copper.sectionMm2)
  })
})

