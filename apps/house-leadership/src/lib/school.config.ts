export type HouseConfig = {
  name: string
  color: string
  gradient: string
  accentGradient: string
  logo: string
  aliases: string[]
}

export type SchoolConfig = {
  schoolName: string
  systemName: string
  tagline: string
  crestLogo: string
  houses: HouseConfig[]
}

const config: SchoolConfig = {
  schoolName: 'Brighter Horizon Academy',
  systemName: 'League of Stars',
  tagline: 'Nurturing Leaders of Tomorrow',
  crestLogo: '/crest.png',
  houses: [
    {
      name: 'House of Abū Bakr',
      color: '#2f0a61',
      gradient: 'linear-gradient(135deg, #4a1a8a 0%, #2f0a61 50%, #1a0536 100%)',
      accentGradient: 'linear-gradient(135deg, #6b2fad 0%, #4a1a8a 100%)',
      logo: '/houses/abu-bakr.png',
      aliases: ['abu bakr', 'abubakr', 'abu-bakr', 'bakr'],
    },
    {
      name: 'House of Khadījah',
      color: '#055437',
      gradient: 'linear-gradient(135deg, #0a7a50 0%, #055437 50%, #033320 100%)',
      accentGradient: 'linear-gradient(135deg, #0d9963 0%, #0a7a50 100%)',
      logo: '/houses/khadijah.png',
      aliases: ['khadijah', 'khadija', 'khad'],
    },
    {
      name: 'House of ʿUmar',
      color: '#000068',
      gradient: 'linear-gradient(135deg, #1a1a9a 0%, #000068 50%, #000040 100%)',
      accentGradient: 'linear-gradient(135deg, #2a2ab8 0%, #1a1a9a 100%)',
      logo: '/houses/umar.png',
      aliases: ['umar', 'omar'],
    },
    {
      name: 'House of ʿĀʾishah',
      color: '#910000',
      gradient: 'linear-gradient(135deg, #c41a1a 0%, #910000 50%, #5a0000 100%)',
      accentGradient: 'linear-gradient(135deg, #e02d2d 0%, #c41a1a 100%)',
      logo: '/houses/aishah.png',
      aliases: ['aishah', 'aisha', 'ayesha'],
    },
  ],
}

export const schoolConfig = config

export function canonicalHouseName(houseName: string): string {
  const normalized = houseName
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[''`ʿʾ]/g, "'")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

  const match = config.houses.find((house) => {
    const houseNormalized = house.name
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[''`ʿʾ]/g, "'")
      .toLowerCase()
      .trim()
    if (houseNormalized === normalized) return true
    return house.aliases.some((alias) => normalized.includes(alias))
  })

  return match?.name || houseName
}

export function getHouseConfigRecord() {
  return config.houses.reduce((acc, house) => {
    acc[house.name] = house
    return acc
  }, {} as Record<string, HouseConfig>)
}

export const HOUSE_NAMES = config.houses.map((house) => house.name)
