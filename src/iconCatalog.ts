export const ICON_IDS = ["uF020_space", "uF021_exclam", "uF022_quotedbl", "uF024_dollar", "uF025_percent", "uF026_ampersand", "uF028_parenleft", "uF029_parenright", "uF02A_asterisk", "uF02B_plus", "uF02C_comma", "uF02D_hyphen", "uF02E_period", "uF02F_slash", "uF030_zero", "uF031_one", "uF032_two", "uF033_three", "uF034_four", "uF035_five", "uF036_six", "uF037_seven", "uF038_eight", "uF039_nine", "uF03A_colon", "uF03B_semicolon", "uF03C_less", "uF03E_greater", "uF03F_question", "uF040_at", "uF041_A", "uF042_B", "uF043_C", "uF044_D", "uF045_E", "uF046_F", "uF047_G", "uF048_H", "uF049_I", "uF04A_J", "uF04B_K", "uF04C_L", "uF04D_M", "uF04E_N", "uF04F_O", "uF050_P", "uF051_Q", "uF052_R", "uF053_S", "uF054_T", "uF055_U", "uF056_V", "uF057_W", "uF058_X", "uF059_Y", "uF05A_Z", "uF05B_bracketleft", "uF05C_backslash", "uF05D_bracketright", "uF05E_asciicircum", "uF05F_underscore", "uF061_a", "uF062_b", "uF063_c", "uF064_d", "uF065_e", "uF066_f", "uF067_g", "uF068_h", "uF069_i", "uF06A_j", "uF06B_k", "uF06C_l", "uF06D_m", "uF06E_n", "uF06F_o", "uF070_p", "uF071_q", "uF072_r", "uF073_s", "uF074_t", "uF075_u", "uF076_v", "uF077_w", "uF078_x", "uF079_y", "uF07A_z", "uF07B_braceleft", "uF07C_bar", "uF07E_asciitilde", "uF081_c129", "uF083_florin", "uF084_quotedblbase", "uF0B4_acute", "uF0B5_mu", "uF0B6_paragraph", "uF0B7_periodcentered", "uF0B8_cedilla", "uF0B9_onesuperior", "uF0BA_ordmasculine", "uF0BB_guillemotright", "uF0BC_onequarter", "uF0BD_onehalf", "uF0BE_threequarters", "uF0BF_questiondown", "uF0C0_Agrave", "uF0C1_Aacute", "uF0C2_Acircumflex", "uF0C3_Atilde", "unmapped__notdef"] as const;
export type IconId = (typeof ICON_IDS)[number];

/** Icons the picker may show — only the set supplied from the leaflet. */
export const PICKER_ICONS = [
  { id: "uF058_X", label: "BR arrows" },
  { id: "uF064_d", label: "Diesel" },
  { id: "uF05F_underscore", label: "Steam" },
  { id: "uF075_u", label: "Diamond" },
  { id: "uF05D_bracketright", label: "Lozenge" },
  { id: "uF04F_O", label: "Wheelchair" },
  { id: "uF028_parenleft", label: "N" },
  { id: "uF029_parenright", label: "Compass" },
  { id: "uF02B_plus", label: "North" },
  { id: "uF02F_slash", label: "S" },
  { id: "uF05C_backslash", label: "Closed" },
  { id: "uF05E_asciicircum", label: "B" },
  { id: "uF067_g", label: "G" },
  { id: "uF068_h", label: "Cross" },
  { id: "uF06C_l", label: "Plus" },
  { id: "uF06D_m", label: "Hash" },
  { id: "uF073_s", label: "Square" },
  { id: "uF074_t", label: "Circle" },
  { id: "uF076_v", label: "Club" },
  { id: "uF077_w", label: "Spade" },
  { id: "uF078_x", label: "Heart" },
  { id: "uF079_y", label: "Star" },
  { id: "uF07E_asciitilde", label: "L" },
  { id: "uF0B6_paragraph", label: "Section" },
  { id: "uF0BD_onehalf", label: "Z" },
] as const;
