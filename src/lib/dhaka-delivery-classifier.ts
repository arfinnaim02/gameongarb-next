export type DeliveryZone = "INSIDE_DHAKA" | "OUTSIDE_DHAKA";

export type DeliveryDetection = {
  zone: DeliveryZone;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  matchedBy:
    | "OUTSIDE_OVERRIDE"
    | "DHAKA_LOCALITY"
    | "DHAKA_POSTCODE"
    | "DHAKA_EXPLICIT"
    | "FUZZY_DHAKA_LOCALITY"
    | "SAFE_FALLBACK";
  matchedValue: string | null;
  normalizedAddress: string;
};

const BANGLA_DIGITS = new Map<string, string>([
  ["০", "0"], ["১", "1"], ["২", "2"], ["৩", "3"], ["৪", "4"],
  ["৫", "5"], ["৬", "6"], ["৭", "7"], ["৮", "8"], ["৯", "9"],
]);

function replaceBanglaDigits(value: string) {
  return [...value].map((char) => BANGLA_DIGITS.get(char) ?? char).join("");
}

export function normalizeDeliveryAddress(value: string) {
  return replaceBanglaDigits(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[\r\n\t,;/|()[\]{}:._#\-–—]+/g, " ")
    .replace(/\b(?:address|addr|district|zilla|zila|thana|police station|p s)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(normalizedAddress: string, phrase: string) {
  const normalizedPhrase = normalizeDeliveryAddress(phrase);
  if (!normalizedPhrase) return false;
  return (` ${normalizedAddress} `).includes(` ${normalizedPhrase} `);
}

const OUTSIDE_DHAKA_OVERRIDES = [
  "savar", "saver", "সাভার",
  "ashulia", "asulia", "asholiya", "ashuliya", "আশুলিয়া", "আশুলিয়া",
  "dhamrai", "ধামরাই",
  "keraniganj", "keranigonj", "কেরানীগঞ্জ",
  "dohar", "দোহার",
  "nawabganj", "nawabgonj", "নবাবগঞ্জ",
  "tongi", "টঙ্গী",
  "gazipur", "গাজীপুর",
  "narayanganj", "নারায়ণগঞ্জ", "নারায়ণগঞ্জ",
  "bagerhat", "বাগেরহাট",
  "bandarban", "বান্দরবান",
  "barguna", "বরগুনা",
  "barishal", "barisal", "বরিশাল",
  "bhola", "ভোলা",
  "bogura", "bogra", "বগুড়া", "বগুড়া",
  "brahmanbaria", "ব্রাহ্মণবাড়িয়া", "ব্রাহ্মণবাড়িয়া",
  "chandpur", "চাঁদপুর",
  "chapainawabganj", "chapai nawabganj", "চাঁপাইনবাবগঞ্জ",
  "chattogram", "chittagong", "চট্টগ্রাম",
  "chuadanga", "চুয়াডাঙ্গা", "চুয়াডাঙ্গা",
  "coxs bazar", "cox bazar", "cox s bazar", "কক্সবাজার",
  "cumilla", "comilla", "কুমিল্লা",
  "dinajpur", "দিনাজপুর",
  "faridpur", "ফরিদপুর",
  "feni", "ফেনী",
  "gaibandha", "গাইবান্ধা",
  "gopalganj", "গোপালগঞ্জ",
  "habiganj", "হবিগঞ্জ",
  "jamalpur", "জামালপুর",
  "jashore", "jessore", "যশোর",
  "jhalokati", "jhalokathi", "ঝালকাঠি",
  "jhenaidah", "ঝিনাইদহ",
  "joypurhat", "জয়পুরহাট", "জয়পুরহাট",
  "khagrachhari", "khagrachari", "খাগড়াছড়ি", "খাগড়াছড়ি",
  "khulna", "খুলনা",
  "kishoreganj", "কিশোরগঞ্জ",
  "kurigram", "কুড়িগ্রাম", "কুড়িগ্রাম",
  "kushtia", "কুষ্টিয়া", "কুষ্টিয়া",
  "lakshmipur", "laxmipur", "লক্ষ্মীপুর",
  "lalmonirhat", "লালমনিরহাট",
  "madaripur", "মাদারীপুর",
  "magura", "মাগুরা",
  "manikganj", "মানিকগঞ্জ",
  "meherpur", "মেহেরপুর",
  "moulvibazar", "maulvibazar", "মৌলভীবাজার",
  "munshiganj", "মুন্সিগঞ্জ",
  "mymensingh", "ময়মনসিংহ", "ময়মনসিংহ",
  "naogaon", "নওগাঁ",
  "narail", "নড়াইল", "নড়াইল",
  "narsingdi", "নরসিংদী",
  "natore", "নাটোর",
  "netrokona", "নেত্রকোনা",
  "nilphamari", "নীলফামারী",
  "noakhali", "নোয়াখালী", "নোয়াখালী",
  "pabna", "পাবনা",
  "panchagarh", "পঞ্চগড়", "পঞ্চগড়",
  "patuakhali", "পটুয়াখালী", "পটুয়াখালী",
  "pirojpur", "পিরোজপুর",
  "rajbari", "রাজবাড়ী", "রাজবাড়ী",
  "rajshahi", "রাজশাহী",
  "rangamati", "রাঙ্গামাটি",
  "rangpur", "রংপুর",
  "satkhira", "সাতক্ষীরা",
  "shariatpur", "শরীয়তপুর", "শরীয়তপুর",
  "sherpur", "শেরপুর",
  "sirajganj", "sirajgonj", "সিরাজগঞ্জ",
  "sunamganj", "সুনামগঞ্জ",
  "sylhet", "সিলেট",
  "tangail", "টাঙ্গাইল",
  "thakurgaon", "ঠাকুরগাঁও",
] as const;

const DHAKA_LOCALITIES = [
  "mirpur", "মিরপুর", "mirpur dohs", "মিরপুর ডিওএইচএস",
  "pallabi", "পল্লবী", "kafrul", "কাফরুল",
  "kazipara", "কাজীপাড়া", "কাজীপাড়া",
  "shewrapara", "sewrapara", "শেওড়াপাড়া", "শেওড়াপাড়া",
  "senpara", "senpara parbata", "সেনপাড়া", "সেনপাড়া", "সেনপাড়া পর্বতা",
  "monipur", "মনিপুর", "rupnagar", "রূপনগর", "kalshi", "কালশী",
  "matrikata", "matikata", "মাটিকাটা", "vasantek", "bhashantek", "ভাসানটেক",
  "ibrahimpur", "ইব্রাহিমপুর", "manikdi", "মানিকদী", "shah ali", "শাহ আলী",
  "pirerbag", "pirerbagh", "পীরেরবাগ", "paikpara", "পাইকপাড়া", "পাইকপাড়া",
  "60 feet", "60feet", "cantonment", "dhaka cantonment", "ক্যান্টনমেন্ট", "ঢাকা ক্যান্টনমেন্ট",
  "ecb chattar", "ইসিবি চত্বর", "kochukhet", "কচুক্ষেত",
  "uttara", "উত্তরা", "uttara model town", "উত্তরা মডেল টাউন",
  "diabari", "দিয়াবাড়ি", "দিয়াবাড়ি", "house building", "হাউস বিল্ডিং",
  "azampur", "আজমপুর", "abdullahpur", "আব্দুল্লাহপুর", "kamarpara", "কামারপাড়া", "কামারপাড়া",
  "turag", "তুরাগ", "dakshinkhan", "dakkhinkhan", "দক্ষিণখান", "দক্ষিনখান",
  "uttarkhan", "উত্তরখান", "ashkona", "আশকোনা", "faydabad", "ফায়দাবাদ", "ফায়দাবাদ",
  "kawla", "কাওলা", "airport", "hazrat shahjalal airport", "এয়ারপোর্ট", "এয়ারপোর্ট",
  "gulshan", "গুলশান", "gulshan 1", "গুলশান 1", "গুলশান ১", "gulshan 2", "গুলশান 2", "গুলশান ২",
  "banani", "বনানী", "banani dohs", "বনানী ডিওএইচএস", "baridhara", "বারিধারা",
  "baridhara dohs", "বারিধারা ডিওএইচএস", "baridhara diplomatic zone", "বারিধারা ডিপ্লোম্যাটিক জোন",
  "niketan", "নিকেতন", "mohakhali", "মহাখালী", "mohakhali dohs", "মহাখালী ডিওএইচএস",
  "wireless gate", "ওয়ারলেস গেট", "ওয়্যারলেস গেট", "kakoli", "কাকলী",
  "chairman bari", "চেয়ারম্যান বাড়ি", "চেয়ারম্যান বাড়ি",
  "badda", "বাড্ডা", "uttar badda", "uttor badda", "উত্তর বাড্ডা",
  "middle badda", "মধ্য বাড্ডা", "south badda", "দক্ষিণ বাড্ডা",
  "merul", "মেরুল", "merul badda", "মেরুল বাড্ডা",
  "aftabnagar", "aftab nagar", "আফতাবনগর", "আফতাব নগর",
  "shahjadpur", "shahzadpur", "শাহজাদপুর", "nadda", "নাড্ডা",
  "notun bazar", "natun bazar", "নতুন বাজার", "satarkul", "সাতারকুল", "beraid", "বেরাইদ",
  "vatara", "bhatara", "ভাটারা", "basundhara", "bashundhara", "বসুন্ধরা",
  "bashundhara r a", "basundhara r a", "বসুন্ধরা আবাসিক এলাকা",
  "jamuna future park", "যমুনা ফিউচার পার্ক", "kuril", "কুড়িল", "কুড়িল",
  "kuratoli", "কুড়াতলী", "কুড়াতলী", "khilkhet", "খিলক্ষেত", "nikunja", "nikunjo", "নিকুঞ্জ",
  "joar sahara", "জোয়ার সাহারা", "জোয়ার সাহারা", "khilbarirtek", "খিলবাড়িরটেক", "খিলবাড়িরটেক",
  "solmaid", "সোলমাইদ", "namapara", "নামাপাড়া", "নামাপাড়া",
  "mohammadpur", "mohammedpur", "মোহাম্মদপুর", "adabor", "আদাবর", "bosila", "বসিলা",
  "dhaka uddan", "ঢাকা উদ্যান", "mohammadia housing", "মোহাম্মদিয়া হাউজিং", "মোহাম্মদিয়া হাউজিং",
  "baitul aman housing", "বায়তুল আমান হাউজিং", "বায়তুল আমান হাউজিং",
  "chan mia housing", "চাঁন মিয়া হাউজিং", "চান মিয়া হাউজিং",
  "japan garden city", "জাপান গার্ডেন সিটি", "lalmatia", "লালমাটিয়া", "লালমাটিয়া",
  "rayerbazar", "rayer bazar", "রায়েরবাজার", "রায়েরবাজার", "shankar", "শংকর", "শঙ্কর",
  "dhanmondi", "ধানমন্ডি", "jigatola", "zigatola", "জিগাতলা", "kalabagan", "kolabagan", "কলাবাগান",
  "green road", "গ্রিন রোড", "গ্রীন রোড", "panthapath", "পান্থপথ", "kathalbagan", "কাঁঠালবাগান",
  "shukrabad", "শুক্রাবাদ", "sobhanbag", "সোবহানবাগ", "science lab", "সায়েন্স ল্যাব", "সায়েন্স ল্যাব",
  "hazaribagh", "হাজারীবাগ", "tejgaon", "তেজগাঁও", "tejgaon industrial area", "তেজগাঁও শিল্প এলাকা",
  "farmgate", "ফার্মগেট", "karwan bazar", "kawran bazar", "কারওয়ান বাজার", "কারওয়ান বাজার",
  "nakhalpara", "নাখালপাড়া", "নাখালপাড়া", "monipuripara", "মনিপুরীপাড়া", "মনিপুরীপাড়া",
  "indira road", "ইন্দিরা রোড", "begunbari", "বেগুনবাড়ি", "বেগুনবাড়ি", "hatirjheel", "হাতিরঝিল",
  "moghbazar", "mogbazar", "মগবাজার", "nayatola", "noyatola", "নয়াটোলা", "নয়াটোলা",
  "eskaton", "ইস্কাটন", "new eskaton", "নিউ ইস্কাটন", "banglamotor", "bangla motor", "বাংলামোটর", "বাংলা মোটর",
  "rampura", "রামপুরা", "east rampura", "পূর্ব রামপুরা", "west rampura", "পশ্চিম রামপুরা",
  "banasree", "bansree", "bonosree", "বনশ্রী", "south banasree", "দক্ষিণ বনশ্রী",
  "khilgaon", "খিলগাঁও", "taltola khilgaon", "খিলগাঁও তালতলা", "goran", "গোরান",
  "south goran", "দক্ষিণ গোরান", "sipahibagh", "সিপাহীবাগ", "meradia", "মেরাদিয়া", "মেরাদিয়া",
  "tilpapara", "তিলপাপাড়া", "তিলপাপাড়া", "madartek", "মাদারটেক", "basabo", "bashabo", "বাসাবো",
  "sabujbagh", "সবুজবাগ", "mugda", "মুগদা", "mugdapara", "মুগদাপাড়া", "মুগদাপাড়া",
  "manda", "মান্ডা", "shahjahanpur", "শাহজাহানপুর", "shantibagh", "শান্তিবাগ",
  "malibagh", "malibag", "মালিবাগ", "shantinagar", "শান্তিনগর",
  "jatrabari", "যাত্রাবাড়ী", "যাত্রাবাড়ী", "demra", "ডেমরা", "matuail", "মাতুয়াইল", "মাতুয়াইল",
  "konapara", "কোনাপাড়া", "কোনাপাড়া", "sarulia", "সারুলিয়া", "সারুলিয়া",
  "shonir akhra", "shanir akhra", "শনির আখড়া", "শনির আখড়া",
  "rayerbag", "রায়েরবাগ", "রায়েরবাগ", "donia", "দনিয়া", "দনিয়া", "jurain", "জুরাইন",
  "kadamtali", "কদমতলী", "shyampur", "শ্যামপুর", "postogola", "পোস্তগোলা",
  "dholairpar", "ধোলাইরপাড়", "ধোলাইরপাড়",
  "ramna", "রমনা", "paltan", "পল্টন", "purana paltan", "পুরানা পল্টন", "kakrail", "কাকরাইল",
  "shahbagh", "shahbag", "শাহবাগ", "segunbagicha", "shegunbagicha", "সেগুনবাগিচা",
  "bailey road", "baily road", "বেইলি রোড", "minto road", "মিন্টো রোড", "paribagh", "পরীবাগ",
  "hatirpool", "হাতিরপুল", "elephant road", "এলিফ্যান্ট রোড", "new market", "নিউ মার্কেট",
  "azimpur", "আজিমপুর", "nilkhet", "নীলক্ষেত", "dhaka university", "university of dhaka",
  "ঢাকা বিশ্ববিদ্যালয়", "ঢাকা বিশ্ববিদ্যালয়", "buet", "বুয়েট", "বুয়েট",
  "motijheel", "মতিঝিল", "kamalapur", "কমলাপুর", "fakirapool", "ফকিরাপুল",
  "arambagh", "আরামবাগ", "rajarbagh", "রাজারবাগ", "shapla chattar", "শাপলা চত্বর",
  "old dhaka", "puran dhaka", "পুরান ঢাকা", "lalbagh", "লালবাগ",
  "chawkbazar", "chawk bazar", "chokbazar", "চকবাজার", "bangshal", "bongshal", "বংশাল",
  "sutrapur", "সূত্রাপুর", "wari", "ওয়ারী", "ওয়ারী", "narinda", "নারিন্দা",
  "tikatuli", "টিকাটুলি", "gendaria", "gandaria", "গেন্ডারিয়া", "গেন্ডারিয়া",
  "sadarghat", "সদরঘাট", "laxmibazar", "lakshmibazar", "লক্ষ্মীবাজার",
  "nawabpur", "নবাবপুর", "shankharibazar", "শাঁখারীবাজার", "tantibazar", "তাঁতীবাজার",
  "islampur", "ইসলামপুর", "armanitala", "armanitola", "আরমানিটোলা",
  "bakshibazar", "bakshi bazar", "বকশীবাজার", "urdu road", "উর্দু রোড",
  "kamrangirchar", "kamrangir char", "কামরাঙ্গীরচর",
] as const;

const DHAKA_CITY_POSTCODES = new Set([
  "1000", "1100", "1203", "1204", "1205", "1206", "1207", "1208", "1209",
  "1211", "1212", "1213", "1214", "1215", "1216", "1217", "1219",
  "1229", "1230", "1236",
]);

function extractPostcodes(normalizedAddress: string) {
  return normalizedAddress.match(/\b1\d{3}\b/g) ?? [];
}

function editDistance(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function findConservativeFuzzyDhakaMatch(normalizedAddress: string) {
  const words = normalizedAddress
    .split(" ")
    .filter((word) => /^[a-z]+$/.test(word) && word.length >= 6);

  if (words.length === 0) return null;

  const singleWordAliases = DHAKA_LOCALITIES
    .map((value) => normalizeDeliveryAddress(value))
    .filter((value) => /^[a-z]+$/.test(value) && value.length >= 6);

  for (const word of words) {
    for (const alias of singleWordAliases) {
      if (word[0] !== alias[0]) continue;
      if (Math.abs(word.length - alias.length) > 1) continue;
      if (editDistance(word, alias) <= 1) return alias;
    }
  }

  return null;
}

export function detectDeliveryZoneFromAddress(address: string): DeliveryDetection {
  const normalizedAddress = normalizeDeliveryAddress(address);

  if (normalizedAddress.length < 3) {
    return {
      zone: "OUTSIDE_DHAKA",
      confidence: "LOW",
      matchedBy: "SAFE_FALLBACK",
      matchedValue: null,
      normalizedAddress,
    };
  }

  for (const value of OUTSIDE_DHAKA_OVERRIDES) {
    if (hasPhrase(normalizedAddress, value)) {
      return {
        zone: "OUTSIDE_DHAKA",
        confidence: "HIGH",
        matchedBy: "OUTSIDE_OVERRIDE",
        matchedValue: value,
        normalizedAddress,
      };
    }
  }

  for (const value of DHAKA_LOCALITIES) {
    if (hasPhrase(normalizedAddress, value)) {
      return {
        zone: "INSIDE_DHAKA",
        confidence: "HIGH",
        matchedBy: "DHAKA_LOCALITY",
        matchedValue: value,
        normalizedAddress,
      };
    }
  }

  for (const postcode of extractPostcodes(normalizedAddress)) {
    if (DHAKA_CITY_POSTCODES.has(postcode)) {
      return {
        zone: "INSIDE_DHAKA",
        confidence: "HIGH",
        matchedBy: "DHAKA_POSTCODE",
        matchedValue: postcode,
        normalizedAddress,
      };
    }
  }

  const fuzzy = findConservativeFuzzyDhakaMatch(normalizedAddress);
  if (fuzzy) {
    return {
      zone: "INSIDE_DHAKA",
      confidence: "MEDIUM",
      matchedBy: "FUZZY_DHAKA_LOCALITY",
      matchedValue: fuzzy,
      normalizedAddress,
    };
  }

  const withoutDivision = normalizedAddress
    .replace(/\bdhaka division\b/g, " ")
    .replace(/ঢাকা বিভাগ/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (hasPhrase(withoutDivision, "dhaka") || hasPhrase(withoutDivision, "ঢাকা")) {
    return {
      zone: "INSIDE_DHAKA",
      confidence: "MEDIUM",
      matchedBy: "DHAKA_EXPLICIT",
      matchedValue: hasPhrase(withoutDivision, "ঢাকা") ? "ঢাকা" : "dhaka",
      normalizedAddress,
    };
  }

  return {
    zone: "OUTSIDE_DHAKA",
    confidence: "LOW",
    matchedBy: "SAFE_FALLBACK",
    matchedValue: null,
    normalizedAddress,
  };
}

export function getDeliveryChargeFromAddress(
  address: string,
  insideDhaka = 80,
  outsideDhaka = 150,
) {
  const detection = detectDeliveryZoneFromAddress(address);

  return {
    ...detection,
    charge: detection.zone === "INSIDE_DHAKA" ? insideDhaka : outsideDhaka,
  };
}
