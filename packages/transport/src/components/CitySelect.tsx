import GeoCityPicker from '@gaido/ui-primitives/GeoCityPicker'
import type { City } from '@gaido/api-client/api/types/catalog'

type Props = {
  value?: number
  onChange: (cityId: number, city?: City) => void
  placeholder?: string
  label?: string
}

/** Country + city picker used in the carrier cabinet — same form as on guides. */
export default function CitySelect({ value, onChange, label }: Props) {
  return (
    <GeoCityPicker
      label={label}
      value={value ?? 0}
      onChange={(id) => onChange(id)}
    />
  )
}
