export interface ReplacementsInterface {
  [key: string]: string
}

export type Replacements = ReplacementsInterface | (string | number)[]
