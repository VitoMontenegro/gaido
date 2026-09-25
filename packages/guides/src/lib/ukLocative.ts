const VOWELS = 'аеєиіїоуюя'

/** «у Празі» / «в Італії» — місцевий відмінок для будь-якої назви. */
export function ukInLocative(name: string) {
  const loc = ukLocative(name)
  if (!loc) return ''
  return `${startsWithVowel(loc) ? 'в' : 'у'} ${loc}`
}

export function ukLocative(name: string) {
  const trimmed = name.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  if (isAbbreviation(trimmed)) return trimmed
  if (trimmed.includes(' і ')) {
    return trimmed.split(' і ').map(ukLocative).join(' і ')
  }
  const words = trimmed.split(' ')
  if (words.length >= 2) {
    const last = words.length - 1
    const noun = locativeToken(words[last])
    words[last] = noun
    words[last - 1] = locativeAdjective(words[last - 1], noun)
    return words.join(' ')
  }
  return locativeToken(trimmed)
}

function isAbbreviation(name: string) {
  return name.length <= 5 && name === name.toUpperCase()
}

function startsWithVowel(name: string) {
  return VOWELS.includes(name.charAt(0).toLowerCase())
}

function locativeToken(token: string) {
  const hyphen = token.includes('-') ? '-' : token.includes('–') ? '–' : ''
  if (!hyphen) return locativeWord(token)
  const cut = token.lastIndexOf(hyphen)
  return token.slice(0, cut + 1) + locativeWord(token.slice(cut + 1))
}

function locativeAdjective(word: string, noun: string) {
  const lower = word.toLowerCase()
  if (noun.toLowerCase().endsWith('ах')) {
    if (lower.endsWith('і')) return word.slice(0, -1) + 'их'
    return word
  }
  if (lower.endsWith('а') || lower.endsWith('я')) return word.slice(0, -1) + 'ій'
  return word
}

function locativeWord(word: string) {
  const lower = word.toLowerCase()
  if (!lower) return word
  if (lower.endsWith('йорк')) return word.slice(0, -3) + 'орку'
  if (/[оеєую]$/.test(lower)) return word
  if (lower.endsWith('і')) return word
  if (lower.endsWith('и')) return word.slice(0, -1) + 'ах'
  if (lower.endsWith('ень')) return word.slice(0, -3) + 'ні'
  if (lower.endsWith('їв')) return word.slice(0, -2) + 'єві'
  if (lower.endsWith('ів')) return word.slice(0, -2) + 'ові'
  if (/(ськ|цьк|зьк)$/.test(lower)) return word + 'у'
  if (lower.endsWith('ія')) return word.slice(0, -1) + 'ї'
  if (lower.endsWith('ща')) return word.slice(0, -1) + 'і'
  if (lower.endsWith('га')) return word.slice(0, -2) + 'зі'
  if (lower.endsWith('ка')) return word.slice(0, -2) + 'ці'
  if (lower.endsWith('ха')) return word.slice(0, -2) + 'сі'
  if (lower.endsWith('а') || lower.endsWith('я')) return word.slice(0, -1) + 'і'
  if (lower.endsWith('ь')) return word.slice(0, -1) + 'і'
  if (lower.endsWith('г')) return word.slice(0, -1) + 'зі'
  if (lower.endsWith('к')) return word.slice(0, -1) + 'ці'
  if (lower.endsWith('х')) return word.slice(0, -1) + 'сі'
  return word + 'і'
}
