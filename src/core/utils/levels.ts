function getRequiredXP(level: number) {
  return 10 * (level ** 2 + (17 * level) + 15)
}

const levels: { level: number, xpRequirement: number, next: number }[] = []
for (const k in [...Array(11).keys()]) {
  const x = Number(k)
  levels.push({
    level: x + 1,
    xpRequirement: getRequiredXP(x),
    next: getRequiredXP(x + 1),
  })
}

export function xpToLevel(xp: number) {
  if (xp < 150)
    return 0
  for (const level of levels) {
    if (xp >= level.xpRequirement && xp < level.next)
      return level.level
  }
  return 0
}
