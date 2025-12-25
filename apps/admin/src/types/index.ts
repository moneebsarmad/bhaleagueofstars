export interface Student {
  id: string
  studentName: string
  grade: number
  section: string
  house: string
  gender: string
  password?: string
  parentCode?: number
}

export interface Staff {
  id: string
  staffName: string
  email: string
  role: string
  subject?: string
  gradeLevel?: string
  house?: string
}

export interface MeritLog {
  id: string
  meritId: string
  timestamp: string
  dateOfEvent: string
  studentName: string
  grade: number
  section: string
  house: string
  r: string
  subcategory: string
  points: number
  notes?: string
  staffName: string
}

export type House = 'House of Abū Bakr' | 'House of Khadījah' | 'House of ʿUmar' | 'House of ʿĀʾishah'

export interface HouseStats {
  name: House
  totalPoints: number
  studentCount: number
  color: string
}
