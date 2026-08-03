export interface PresetImage {
  id: string;
  title: string;
  category: "art" | "wonder";
  year: string;
  place: string;
  creator: string;
  /** Short, verified summary in our own words — not copied from any source. */
  blurb: string;
  /** Stable Wikimedia Commons URL. Special:FilePath redirects to the current
   *  upload location, so this keeps working even if the file is renamed. */
  imageUrl: string;
  thumbUrl: string;
  /** Required for CC-BY-SA works; public-domain paintings need none, but we
   *  still credit the artist for context. */
  credit: string;
}

// Special:FilePath is a redirect, and that redirect response itself doesn't
// carry an Access-Control-Allow-Origin header — only the final upload.wikimedia.org
// asset does. Canvas requires every hop in a CORS request to send the header,
// so we build the direct upload.wikimedia.org URL instead, using MediaWiki's
// documented MD5-hash storage path (md5(filename) → first hex char / first
// two hex chars / filename).
function commonsUrl(hash1: string, hash2: string, filename: string, width?: number): string {
  const encoded = encodeURIComponent(filename);
  if (!width) return `https://upload.wikimedia.org/wikipedia/commons/${hash1}/${hash2}/${encoded}`;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash1}/${hash2}/${encoded}/${width}px-${encoded}`;
}

export const PRESET_IMAGES: PresetImage[] = [
  {
    id: "starry-night",
    title: "The Starry Night",
    category: "art",
    year: "1889",
    place: "Saint-Rémy-de-Provence, France",
    creator: "Vincent van Gogh",
    blurb:
      "Van Gogh painted this swirling night sky from memory while staying at an asylum in the south of France, working mostly from the view out his bedroom window. It has hung in the Museum of Modern Art in New York since 1941 and is now one of the most recognized paintings in the world.",
    imageUrl: commonsUrl("e", "ea", "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg", 1400),
    thumbUrl: commonsUrl("e", "ea", "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg", 400),
    credit: "Vincent van Gogh, 1889 — public domain (Museum of Modern Art, via Wikimedia Commons)",
  },
  {
    id: "girl-with-pearl-earring",
    title: "Girl with a Pearl Earring",
    category: "art",
    year: "c. 1665",
    place: "Delft, Netherlands",
    creator: "Johannes Vermeer",
    blurb:
      "Often nicknamed the 'Dutch Mona Lisa,' this isn't a portrait of a real person but a tronie — a study of an imagined face and costume, popular in Dutch art at the time. The identity of the model has never been confirmed. It hangs today in the Mauritshuis museum in The Hague.",
    imageUrl: commonsUrl("c", "ce", "Girl_with_a_Pearl_Earring.jpg", 1400),
    thumbUrl: commonsUrl("c", "ce", "Girl_with_a_Pearl_Earring.jpg", 400),
    credit: "Johannes Vermeer, c. 1665 — public domain (Mauritshuis, via Wikimedia Commons)",
  },
  {
    id: "taj-mahal",
    title: "Taj Mahal",
    category: "wonder",
    year: "1632–1653",
    place: "Agra, India",
    creator: "Commissioned by Mughal emperor Shah Jahan",
    blurb:
      "Shah Jahan built this ivory-white marble mausoleum for his wife Mumtaz Mahal, who died in childbirth. Construction took over two decades and drew materials and craftsmen from across Asia. In 2007 it was voted one of the New7Wonders of the World by more than 100 million people worldwide.",
    imageUrl: commonsUrl("1", "1d", "Taj_Mahal_(Edited).jpeg", 1400),
    thumbUrl: commonsUrl("1", "1d", "Taj_Mahal_(Edited).jpeg", 400),
    credit: "Photo via Wikimedia Commons — CC BY-SA 4.0",
  },
  {
    id: "machu-picchu",
    title: "Machu Picchu",
    category: "wonder",
    year: "c. 1450",
    place: "Cusco Region, Peru",
    creator: "Built under the Inca emperor Pachacuti",
    blurb:
      "Perched high in the Andes, this Inca estate was abandoned during the Spanish conquest and largely forgotten by the outside world until 1911. It's now a UNESCO World Heritage Site and, like the Taj Mahal, one of the New7Wonders of the World.",
    imageUrl: commonsUrl("0", "02", "Machu_Picchu,_Perú,_2015-07-30,_DD_60.JPG", 1400),
    thumbUrl: commonsUrl("0", "02", "Machu_Picchu,_Perú,_2015-07-30,_DD_60.JPG", 400),
    credit: "Photo: Poco a poco, via Wikimedia Commons — CC BY-SA 4.0",
  },
];
