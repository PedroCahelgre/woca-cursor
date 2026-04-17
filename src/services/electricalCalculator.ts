export type InstallationMethod = 'A1' | 'A2' | 'B1' | 'B2' | 'C'
export type MaterialType = 'copper' | 'aluminum'

type PowerInput = {
  powerWatts: number
  distanceMeters: number
  voltage: number
  installationMethod: InstallationMethod
  material: MaterialType
}

type CalculationResult = {
  currentA: number
  sectionMm2: number
  breakerA: number
  voltageDropPercent: number
}

const BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63]

const CAPACITY_TABLE: Record<InstallationMethod, Record<number, number>> = {
  A1: { 1.5: 13.5, 2.5: 18, 4: 24, 6: 31, 10: 43 },
  A2: { 1.5: 13, 2.5: 17.5, 4: 23, 6: 30, 10: 41 },
  B1: { 1.5: 15.5, 2.5: 21, 4: 28, 6: 36, 10: 50 },
  B2: { 1.5: 15, 2.5: 20, 4: 27, 6: 34, 10: 46 },
  C: { 1.5: 18, 2.5: 24, 4: 32, 6: 41, 10: 57 },
}

const RESISTIVITY: Record<MaterialType, number> = {
  copper: 0.0172,
  aluminum: 0.0282,
}

export class ElectricalCalculator {
  calculateFromPower(input: PowerInput): CalculationResult {
    const powerWatts = Math.max(1, input.powerWatts)
    const distanceMeters = Math.max(1, input.distanceMeters)
    const voltage = Math.max(1, input.voltage)
    const currentA = powerWatts / voltage

    const sectionByCapacity = this.findSectionByCapacity(currentA, input.installationMethod)
    const sectionByVoltageDrop = this.findSectionByVoltageDrop(
      currentA,
      distanceMeters,
      voltage,
      input.material,
    )
    const sectionMm2 = Math.max(sectionByCapacity, sectionByVoltageDrop)
    const breakerA = this.selectBreaker(currentA)
    const voltageDropPercent = this.estimateVoltageDropPercent(
      currentA,
      distanceMeters,
      sectionMm2,
      voltage,
      input.material,
    )

    return {
      currentA,
      sectionMm2,
      breakerA,
      voltageDropPercent,
    }
  }

  private findSectionByCapacity(currentA: number, method: InstallationMethod): number {
    const table = CAPACITY_TABLE[method]
    const sections = Object.keys(table).map(Number).sort((a, b) => a - b)
    for (const section of sections) {
      if (table[section] >= currentA) return section
    }
    return sections[sections.length - 1]
  }

  private findSectionByVoltageDrop(
    currentA: number,
    distanceMeters: number,
    voltage: number,
    material: MaterialType,
  ): number {
    const sections = [1.5, 2.5, 4, 6, 10, 16, 25]
    for (const section of sections) {
      const drop = this.estimateVoltageDropPercent(currentA, distanceMeters, section, voltage, material)
      if (drop <= 4) return section
    }
    return 25
  }

  private estimateVoltageDropPercent(
    currentA: number,
    distanceMeters: number,
    sectionMm2: number,
    voltage: number,
    material: MaterialType,
  ): number {
    const rho = RESISTIVITY[material]
    const resistance = (2 * rho * distanceMeters) / sectionMm2
    const voltageDrop = resistance * currentA
    return (voltageDrop / voltage) * 100
  }

  private selectBreaker(currentA: number): number {
    for (const breaker of BREAKERS) {
      if (breaker >= currentA * 1.25) return breaker
    }
    return BREAKERS[BREAKERS.length - 1]
  }
}

