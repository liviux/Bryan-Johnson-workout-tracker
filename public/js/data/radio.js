// Workout radio: public stations from FIP, Radio Paradise, KEXP, The Current,
// Fréquence 3 and Rinse FM. Direct streams keep the player inside the app, so
// volume, mute and station changes work without an iframe. FIP Electro is the
// upbeat default.

import { localized } from "../i18n.js";

export const DEFAULT_RADIO_STATION = "fipelectro";
export const DEFAULT_RADIO_VOLUME = 0.55;

const fip = (id) => `https://icecast.radiofrance.fr/${id}-midfi.mp3`;
const f3 = (file) => `https://frequence3.net-radio.fr/${file}`;

export const RADIO_SOURCES = [
  { name: "FIP", url: "https://www.radiofrance.fr/fip" },
  { name: "Radio Paradise", url: "https://radioparadise.com/" },
  { name: "KEXP", url: "https://www.kexp.org/" },
  { name: "The Current", url: "https://www.thecurrent.org/" },
  { name: "Fréquence 3", url: "https://www.frequence3.com/" },
  { name: "Rinse FM", url: "https://www.rinse.fm/" },
];

export const RADIO_STATIONS = localized([
  {
    id: "fipelectro",
    name: "FIP Electro",
    tag: "Electronic",
    mood: "High energy",
    description: "Electronic music, from house to experimental.",
    stream: fip("fipelectro"),
  },
  {
    id: "fiprock",
    name: "FIP Rock",
    tag: "Rock",
    mood: "High energy",
    description: "Rock, from classics to new releases.",
    stream: fip("fiprock"),
  },
  {
    id: "fipmetal",
    name: "FIP Metal",
    tag: "Metal",
    mood: "High energy",
    description: "Metal and heavy sounds.",
    stream: fip("fipmetal"),
  },
  {
    id: "fiphiphop",
    name: "FIP Hip Hop",
    tag: "Hip-hop",
    mood: "High energy",
    description: "Hip-hop and rap.",
    stream: fip("fiphiphop"),
  },
  {
    id: "f3dance",
    name: "Fréquence 3 Dance",
    tag: "House and dance",
    mood: "High energy",
    description: "House and dance, without the ads.",
    stream: f3("frequence3dance.mp3"),
    fallback: f3("frequence3dance.aac"),
  },
  {
    id: "rinse",
    name: "Rinse FM",
    tag: "UK dance",
    mood: "High energy",
    description: "London dance, grime, house and underground.",
    stream: "https://admin.stream.rinse.fm/proxy/rinse_uk/stream",
  },
  {
    id: "rprock",
    name: "Radio Paradise Rock",
    tag: "Rock",
    mood: "High energy",
    description: "Rock and alternative, from classics to new.",
    stream: "https://stream.radioparadise.com/rock-128",
  },
  {
    id: "fipgroove",
    name: "FIP Groove",
    tag: "Funk and soul",
    mood: "Upbeat",
    description: "Funk, soul and groove.",
    stream: fip("fipgroove"),
  },
  {
    id: "fippop",
    name: "FIP Pop",
    tag: "Pop",
    mood: "Upbeat",
    description: "Pop, new and classic.",
    stream: fip("fippop"),
  },
  {
    id: "fipnouveautes",
    name: "FIP Nouveautés",
    tag: "New releases",
    mood: "Upbeat",
    description: "New releases from across FIP.",
    stream: fip("fipnouveautes"),
  },
  {
    id: "rpmain",
    name: "Radio Paradise",
    tag: "Eclectic rock",
    mood: "Upbeat",
    description: "Eclectic rock, electronic and world music.",
    stream: "https://stream.radioparadise.com/mp3-128",
    fallback: "https://stream.radioparadise.com/aac-128",
  },
  {
    id: "rpglobal",
    name: "Radio Paradise Global",
    tag: "Global beats",
    mood: "Upbeat",
    description: "Rhythms and music from around the world.",
    stream: "https://stream.radioparadise.com/global-128",
  },
  {
    id: "kexp",
    name: "KEXP",
    tag: "Indie and alternative",
    mood: "Upbeat",
    description: "Indie, alternative and electronic from Seattle.",
    stream: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3",
    fallback: "https://kexp.streamguys1.com/kexp128.mp3",
  },
  {
    id: "current",
    name: "The Current",
    tag: "Alternative",
    mood: "Upbeat",
    description: "New indie, alternative and local music from Minnesota.",
    stream: "https://current.stream.publicradio.org/current.mp3",
    fallback: "https://current.stream.publicradio.org/current.aac",
  },
  {
    id: "f3urban",
    name: "Fréquence 3 Urban",
    tag: "Hip-hop and R&B",
    mood: "Upbeat",
    description: "Hip-hop, rap and R&B, without the ads.",
    stream: f3("frequence3urban-128.mp3"),
    fallback: f3("frequence3urban-64.aac"),
  },
  {
    id: "fip",
    name: "FIP",
    tag: "Eclectic",
    mood: "Chill",
    description: "The Paris station's eclectic mix.",
    stream: fip("fip"),
  },
  {
    id: "fipjazz",
    name: "FIP Jazz",
    tag: "Jazz",
    mood: "Chill",
    description: "Jazz, from bop to contemporary.",
    stream: fip("fipjazz"),
  },
  {
    id: "fipreggae",
    name: "FIP Reggae",
    tag: "Reggae",
    mood: "Chill",
    description: "Reggae, dub and roots.",
    stream: fip("fipreggae"),
  },
  {
    id: "fipworld",
    name: "FIP World",
    tag: "World",
    mood: "Chill",
    description: "Music from around the world.",
    stream: fip("fipworld"),
  },
]);

export function radioStation(id) {
  return RADIO_STATIONS.find((station) => station.id === id) || null;
}

export function adjacentStation(id, step) {
  const index = RADIO_STATIONS.findIndex((station) => station.id === id);
  const from = index < 0 ? 0 : index;
  return RADIO_STATIONS[(from + step + RADIO_STATIONS.length) % RADIO_STATIONS.length];
}
