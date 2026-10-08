import GeoCityPicker from '@gaido/ui-primitives/GeoCityPicker'
import type { City } from '@gaido/api-client/api/types/catalog'

type Props = {
  value?: number
  onChange: (cityId: number, city?: City) => void
  placeholder?: string
  label?: string
  required?: boolean
}

/** Country + city picker used in the carrier cabinet — same form as on guides. */
export default function CitySelect({ value, onChange, label, required }: Props) {
  return (
    <GeoCityPicker
      label={label}
      value={value ?? 0}
      required={required}
      onChange={(id) => onChange(id)}
    />
  )
}
