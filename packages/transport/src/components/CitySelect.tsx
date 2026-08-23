import CityPicker from './CityPicker'
import type { City } from '@gaido/api-client/api/types/catalog'

type Props = {
  value?: number
  onChange: (cityId: number, city?: City) => void
  placeholder?: string
  label?: string
}

/** Lightweight city field for account forms — search + select, country shown in option label. */
export default function CitySelect({ value, onChange, label, placeholder }: Props) {
  return (
    <CityPicker
      label={label ?? 'Місто'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  )
}
