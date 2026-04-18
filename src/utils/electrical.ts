# NBR 5410 Electrical Calculations

## Wire Gauge Tables
| Wire Gauge (AWG) | Max Current (A) |
|-------------------|------------------|
| 14                | 15               |
| 12                | 20               |
| 10                | 30               |
| 8                 | 40               |
| 6                 | 55               |
| 4                 | 70               |
| 2                 | 95               |
| 1                 | 130              |
| 1/0               | 150              |
| 2/0               | 175              |
| 3/0               | 200              |
| 4/0               | 230              |

## Current Calculation
The maximum current (I) that the wire can carry is calculated based on the load (in watts) and the voltage (in volts):

\[ I = \frac{P}{V} \]\
Where:
- **P** = Power in watts
- **V** = Voltage in volts

## Breaker Sizing
The breaker rating is calculated as:
\[ Breaker Rating = I \times 1.25 \]

## Voltage Drop Verification
The voltage drop (VD) can be calculated using the formula:
\[ VD = \frac{2 \times L \times I \times R}{1000} \]
Where:
- **L** = One-way length of the wire in meters
- **I** = Current in amperes
- **R** = Resistance of the wire in ohms per kilometer

To comply with NBR 5410, the voltage drop must not exceed 3% of the supply voltage:
\[ VD \leq 0.03 \times V \]

# Example Calculation
Assuming:
- Load = 1500W
- Voltage = 220V
- Wire Length = 30m
- Resistance of 2.5mm² wire = 7.41 ohm/km

1. **Calculate the current:**  \[ I = \frac{1500}{220} \approx 6.82 A \]
2. **Size the breaker:** \[ Breaker Rating = 6.82 \times 1.25 \approx 8.53 A \] (choose a 10A breaker)
3. **Calculate Voltage Drop:**  \[ VD = \frac{2 \times 30 \times 6.82 \times 7.41}{1000} \approx 3.03 V \]
4. **Check compliance:** \[ 3.03 \, V \leq 0.03 \times 220 = 6.6 \, V \] (complies)