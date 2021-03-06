import {
  TextField,
  CheckBoxField,
  SelectField,
} from '../../../utils/form-engine/fields'
import { getBorderOptions } from '../../../utils/plugins/borders'
import {
  getBgOptions,
  getWatermarkOptions,
} from '../../../utils/plugins/images'
import { request } from '../../../utils/plugins/request'

export { getBorderOptions } from '../../../utils/plugins/borders'
export { getBgOptions } from '../../../utils/plugins/images'
export { getWatermarkOptions } from '../../../utils/plugins/images'

export const common_conf = {
  border_style: SelectField({ label: '边框样式', options: getBorderOptions() }),
  bg_style: SelectField({ label: '背景样式', options: getBgOptions() }),
  name: TextField({ label: '名字' }),
  cost: TextField({ label: '法术力费用' }),
  image_url: TextField({ label: '卡图地址' }),
  indicator: TextField({ label: '颜色标记' }),
  type: TextField({ label: '类别' }),
  series: TextField({ label: '系列编号' }),
  rarity: SelectField({
    label: '稀有度',
    options: [
      { label: '普通', value: 'common' },
      { label: '非普通', value: 'uncommon' },
      { label: '稀有', value: 'rare' },
      { label: '秘稀', value: 'mythic' },
    ],
  }),
}

export const uncommon_conf = {
  effect_watermark: SelectField({
    label: '效果栏水印',
    options: getWatermarkOptions(),
  }),
}

/**
 * @param url
 * @returns {Promise<CardType>}
 */
export async function fetchCardInfo(url) {
  const saveLastMultiverseId = id =>
    localStorage.setItem('data:multiverseid', id)
  if (!url) return null

  let rst = null
  const splitted = url.slice(8).split('/')
  const r = await request.getCardBySeries(splitted[2], splitted[3])
  if (!r.error) {
    if (r.image_uris && r.image_uris.large) {
      r.image_uris.large = r.image_uris.large.replace(/zhs/g, 'en')
    }
    rst = r
  }
  // 兼容无中文卡情况
  const enr = await request.getCardBySeries(splitted[2], splitted[3], 'en')
  if (!enr.error) {
    enr.printed_text = enr.oracle_text
    enr.printed_type_line = enr.type_line
    enr.printed_name = enr.name
    saveLastMultiverseId(enr.multiverse_ids[0])
    if (!rst) {
      rst = enr
    } else {
      rst.image_uris.large = enr.image_uris.large
    }
  }
  return rst
}

const DOUBLE_COLORS = [
  'wu',
  'ub',
  'br',
  'rg',
  'gw',
  'wb',
  'ur',
  'bg',
  'rw',
  'gu',
].reduce((acc, color) => {
  const l = color[0],
    r = color[1]
  if (!acc[l]) acc[l] = {}
  if (!acc[r]) acc[r] = {}
  acc[l][r] = 1
  acc[r][l] = 0
  return acc
}, {})

function sortColor(list) {
  if (list.length < 2) return list.map(i => i.toLowerCase())
  return DOUBLE_COLORS[list[0].toLowerCase()][list[1].toLowerCase()]
    ? list
    : list.reverse()
}

export const api_parser = {
  parseCost(obj) {
    return obj.mana_cost
      .replace(/}/g, ',')
      .replace(/{/g, '')
      .slice(0, -1)
      .toLowerCase()
  },
  parseBody(obj) {
    return `${obj.power}/${obj.toughness}`
  },
  parseType(obj) {
    return obj.printed_type_line.replace(/\s/g, '')
  },
  parseEffect(obj) {
    let t = `${obj.printed_text || ''}`
    t = t.replace(/(（)/g, '@$1').replace(/(）)/g, '$1@')
    if (obj.flavor_text) {
      t += `${t.length ? '\n' : ''}#${obj.flavor_text}#`
    }
    return t
  },
  parseBorder(obj) {
    if (obj.type_line.match('Land')) {
      return (
        'l' +
        sortColor(obj.color_identity)
          .join('')
          .toLowerCase()
      )
    }
    if (obj.colors.length === 0) return 'a'
    if (obj.colors.length > 2) return 'm'
    return sortColor(obj.colors)
      .join('')
      .toLowerCase()
  },
  parseBg(obj) {
    const is_land = obj.type_line.match('Land')
    if (obj.colors.length === 0) return is_land ? 'l' : 'a'
    if (obj.colors.length > 1) return 'm'
    return obj.colors[0].toLowerCase()
  },
  parseLegendary(obj) {
    return !!obj.type_line.match(/legendary/i)
  },
  parseIndicator(obj) {
    if (!obj.color_indicator || !obj.color_indicator.length) return ''
    if (obj.color_indicator.length <= 2) {
      return sortColor(obj.color_indicator)
        .join('')
        .toLowerCase()
    } else {
      return obj.color_indicator.join('').toLowerCase()
    }
  },
}
