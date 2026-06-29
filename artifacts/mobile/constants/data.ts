export interface VideoHighlight {
  dish: string;
  tagline: string;
  descriptors: [string, string, string];
  accentColor: string;
}

export interface Listing {
  id: string;
  name: string;
  category: 'restaurants' | 'food-trucks';
  rating: number;
  reviewCount: number;
  address: string;
  city: string;
  neighborhood: string;
  phone: string;
  website: string;
  hours: string;
  description: string;
  tags: string[];
  featured: boolean;
  verified: boolean;
  priceRange: string;
  color: string;
  initials: string;
  hasVideo: boolean;
  video?: VideoHighlight;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  sfSymbol: string;
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All', icon: 'grid', sfSymbol: 'square.grid.2x2' },
  { id: 'restaurants', label: 'Restaurants', icon: 'coffee', sfSymbol: 'fork.knife' },
  { id: 'food-trucks', label: 'Food Trucks', icon: 'truck', sfSymbol: 'car' },
];

export const SAMPLE_LISTINGS: Listing[] = [
  {
    id: '1',
    name: 'La Taqueria',
    category: 'restaurants',
    rating: 4.9,
    reviewCount: 4821,
    address: '2889 Mission St',
    city: 'San Francisco, CA',
    neighborhood: 'Mission District',
    phone: '(415) 285-7117',
    website: 'https://lataqueriasf.com',
    hours: 'Mon–Thu 11:00 AM – 9:00 PM · Fri–Sun 11:00 AM – 9:30 PM',
    description:
      "Since 1973, La Taqueria has been the gold standard for the Mission burrito and taco. No rice in the burrito — just beans, meat, and salsa — a controversial but correct decision that earned them a James Beard America's Classic award.",
    tags: ['Tacos', 'Burritos', 'Carnitas', 'Al Pastor', 'James Beard'],
    featured: true,
    verified: true,
    priceRange: '$',
    color: '#B91C1C',
    initials: 'LT',
    hasVideo: true,
    video: {
      dish: 'Tacos Al Pastor',
      tagline: 'The taco that started it all.',
      descriptors: ['Slow-roasted pork', 'Pineapple kissed', 'Since 1973'],
      accentColor: '#F59E0B',
    },
  },
  {
    id: '2',
    name: 'Flour + Water',
    category: 'restaurants',
    rating: 4.7,
    reviewCount: 2914,
    address: '2401 Harrison St',
    city: 'San Francisco, CA',
    neighborhood: 'Mission District',
    phone: '(415) 826-7000',
    website: 'https://flourandwater.com',
    hours: 'Mon–Thu 5:30 PM – 10:00 PM · Fri–Sat 5:30 PM – 10:30 PM',
    description:
      "Thomas McNaughton's pasta-forward Mission restaurant sources its grain from heritage wheat farms and rolls every noodle by hand each night. The tagliatelle al ragù and bucatini are perennial favorites.",
    tags: ['Handmade Pasta', 'Italian', 'Seasonal', 'Tasting Menu'],
    featured: true,
    verified: true,
    priceRange: '$$$',
    color: '#1e293b',
    initials: 'FW',
    hasVideo: true,
    video: {
      dish: 'Handmade Pasta',
      tagline: 'Made from scratch. Every single night.',
      descriptors: ['Heritage wheat', 'Hand-rolled daily', 'Fire-finished'],
      accentColor: '#e2c27d',
    },
  },
  {
    id: '3',
    name: 'Nopa',
    category: 'restaurants',
    rating: 4.6,
    reviewCount: 3102,
    address: '560 Divisadero St',
    city: 'San Francisco, CA',
    neighborhood: 'Western Addition',
    phone: '(415) 864-8643',
    website: 'https://nopasf.com',
    hours: 'Mon–Fri 5:00 PM – 1:00 AM · Sat–Sun 10:00 AM – 1:00 AM',
    description:
      "A beloved SF institution in a soaring former bank building. The wood-fired half-pound beef burger is arguably the best in the city. Late-night kitchen until 1am.",
    tags: ['Wood-Fired', 'Burger', 'Late Night', 'Rotisserie', 'Brunch'],
    featured: true,
    verified: true,
    priceRange: '$$',
    color: '#14532d',
    initials: 'NP',
    hasVideo: true,
    video: {
      dish: 'Wood-Fired Burger',
      tagline: 'Half a pound of conviction.',
      descriptors: ['Dry-aged beef', 'Gruyère', 'House-baked brioche'],
      accentColor: '#86efac',
    },
  },
  {
    id: '4',
    name: 'Rich Table',
    category: 'restaurants',
    rating: 4.8,
    reviewCount: 1987,
    address: '199 Gough St',
    city: 'San Francisco, CA',
    neighborhood: 'Hayes Valley',
    phone: '(415) 355-9085',
    website: 'https://richtablesf.com',
    hours: 'Mon–Thu 5:30 PM – 10:00 PM · Fri–Sat 5:30 PM – 10:30 PM',
    description:
      "Evan and Sarah Rich's Hayes Valley restaurant. Their legendary sardine chips — potato chips dipped in sardine crème fraîche — became one of SF's most talked-about snacks.",
    tags: ['Sardine Chips', 'California Cuisine', 'Creative', 'Wine'],
    featured: true,
    verified: true,
    priceRange: '$$$',
    color: '#7c2d12',
    initials: 'RT',
    hasVideo: true,
    video: {
      dish: 'Sardine Chips',
      tagline: 'The snack that made SF talk.',
      descriptors: ['House crème fraîche', 'Potato crisp', 'Cult classic'],
      accentColor: '#fbbf24',
    },
  },
  {
    id: '5',
    name: 'Pizzeria Delfina',
    category: 'restaurants',
    rating: 4.5,
    reviewCount: 2678,
    address: '3611 18th St',
    city: 'San Francisco, CA',
    neighborhood: 'Mission District',
    phone: '(415) 437-6800',
    website: 'https://pizzeriadelfina.com',
    hours: 'Mon–Thu 5:00 PM – 10:00 PM · Fri–Sun 12:00 PM – 11:00 PM',
    description:
      'Neapolitan-style pies from a 700-degree wood-burning oven. The marinara and the fennel sausage pie are what regulars reorder. No reservations — join the sidewalk line.',
    tags: ['Neapolitan Pizza', 'Wood-Fired', 'No Reservations', 'Sausage'],
    featured: false,
    verified: true,
    priceRange: '$$',
    color: '#dc2626',
    initials: 'PD',
    hasVideo: false,
  },
  {
    id: '6',
    name: 'Nopalito',
    category: 'restaurants',
    rating: 4.6,
    reviewCount: 1843,
    address: '306 Broderick St',
    city: 'San Francisco, CA',
    neighborhood: 'Western Addition',
    phone: '(415) 437-0303',
    website: 'https://nopalitosf.com',
    hours: 'Tue–Fri 11:30 AM – 9:30 PM · Sat–Sun 10:30 AM – 9:30 PM',
    description:
      'Regional Mexican cooking rooted in Oaxacan traditions. Every tortilla pressed from scratch with masa ground in-house. The slow-braised carnitas bowl and mole negro enchiladas are true SF institutions.',
    tags: ['Mexican', 'Carnitas', 'Mole', 'House Masa', 'Brunch'],
    featured: false,
    verified: true,
    priceRange: '$$',
    color: '#b45309',
    initials: 'NO',
    hasVideo: false,
  },
  {
    id: '7',
    name: 'Namu Stonepot',
    category: 'restaurants',
    rating: 4.7,
    reviewCount: 1122,
    address: '1560 Holloway Ave',
    city: 'San Francisco, CA',
    neighborhood: 'Dogpatch',
    phone: '(415) 431-6268',
    website: 'https://namustonepot.com',
    hours: 'Tue–Sun 11:30 AM – 9:30 PM',
    description:
      'Korean-American comfort food. The stone pot bibimbap — rice crisped against a scorching dolsot, topped with local vegetables and a runny farm egg — is the signature.',
    tags: ['Korean', 'Bibimbap', 'Stone Pot', 'Farm-to-Table', 'Egg'],
    featured: false,
    verified: true,
    priceRange: '$$',
    color: '#0369a1',
    initials: 'NS',
    hasVideo: false,
  },
  {
    id: '8',
    name: 'Liholiho Yacht Club',
    category: 'restaurants',
    rating: 4.8,
    reviewCount: 987,
    address: '871 Sutter St',
    city: 'San Francisco, CA',
    neighborhood: 'Tenderloin',
    phone: '(415) 440-5446',
    website: 'https://liholihoyachtclub.com',
    hours: 'Tue–Sat 5:30 PM – 11:00 PM',
    description:
      "Ravi Kapur's Hawaiian-inspired kitchen. The brisket fried rice, tuna poke on crackers, and coconut cake are essential. Beachy and loud in the best way.",
    tags: ['Hawaiian', 'Fried Rice', 'Poke', 'Fun', 'Coconut Cake'],
    featured: false,
    verified: true,
    priceRange: '$$$',
    color: '#0891b2',
    initials: 'LY',
    hasVideo: false,
  },
  {
    id: '9',
    name: 'The Chairman Truck',
    category: 'food-trucks',
    rating: 4.8,
    reviewCount: 3654,
    address: 'Roaming · Embarcadero & SoMa',
    city: 'San Francisco, CA',
    neighborhood: 'Embarcadero / SoMa',
    phone: '(415) 857-7020',
    website: 'https://thechairmanusa.com',
    hours: 'Mon–Fri 11:00 AM – 2:30 PM · Check @thechairman for location',
    description:
      "SF's original bao truck, James Beard nominated since 2010. The pork belly bao — braised 12 hours in soy, ginger, and five spice, tucked into a steamed bun with pickled cucumber — is the city's most iconic street food bite.",
    tags: ['Bao', 'Pork Belly', 'Braised', 'Steamed Bun', 'James Beard'],
    featured: true,
    verified: true,
    priceRange: '$',
    color: '#dc2626',
    initials: 'CH',
    hasVideo: true,
    video: {
      dish: 'Pork Belly Bao',
      tagline: "San Francisco's original bao truck.",
      descriptors: ['Braised 12 hours', 'Steamed fresh', 'House five-spice'],
      accentColor: '#fca5a5',
    },
  },
  {
    id: '10',
    name: 'Señor Sisig',
    category: 'food-trucks',
    rating: 4.7,
    reviewCount: 2341,
    address: 'Roaming · SoMa & Mission',
    city: 'San Francisco, CA',
    neighborhood: 'SoMa / Mission',
    phone: '(415) 912-5000',
    website: 'https://senorsisig.com',
    hours: 'Mon–Fri 11:00 AM – 2:30 PM · Thu–Sat 5:00 PM – 9:00 PM',
    description:
      'Filipino BBQ meets Mission Street burrito. The sisig — crispy sizzling pork with citrus and chili — wrapped with garlic fried rice and chili aioli in a massive flour tortilla.',
    tags: ['Filipino', 'Sisig', 'Burrito', 'Garlic Rice', 'Fusion'],
    featured: true,
    verified: true,
    priceRange: '$',
    color: '#1d4ed8',
    initials: 'SS',
    hasVideo: true,
    video: {
      dish: 'Sisig Burrito',
      tagline: 'Filipino BBQ meets the Mission.',
      descriptors: ['Crispy sisig', 'Garlic fried rice', 'Chili aioli'],
      accentColor: '#93c5fd',
    },
  },
  {
    id: '11',
    name: 'Tacos El Camión',
    category: 'food-trucks',
    rating: 4.6,
    reviewCount: 1789,
    address: 'Roaming · Mission District',
    city: 'San Francisco, CA',
    neighborhood: 'Mission District',
    phone: '(415) 874-9921',
    website: 'https://tacoselcamion.com',
    hours: 'Daily 10:00 AM – 10:00 PM',
    description:
      'The birria taco game in SF runs through this bright red truck. Beef braised overnight in consommé, crisped on a griddle, loaded into a corn tortilla with Oaxacan cheese. Dip it in the consommé. Trust.',
    tags: ['Birria', 'Tacos', 'Consommé', 'Quesabirria', 'Late Night'],
    featured: false,
    verified: true,
    priceRange: '$',
    color: '#991b1b',
    initials: 'EC',
    hasVideo: false,
  },
  {
    id: '12',
    name: 'Curry Up Now',
    category: 'food-trucks',
    rating: 4.5,
    reviewCount: 2198,
    address: 'Roaming · FiDi & SoMa',
    city: 'San Francisco, CA',
    neighborhood: 'Financial District',
    phone: '(415) 910-9400',
    website: 'https://curryupnow.com',
    hours: 'Mon–Fri 11:00 AM – 3:00 PM',
    description:
      'The truck that launched the Indian street food movement in the Bay Area. The deconstructed samosa became a social media sensation. The tikka masala burrito remains the most-ordered item.',
    tags: ['Indian', 'Tikka Masala', 'Deconstructed Samosa', 'Fusion', 'Burrito'],
    featured: false,
    verified: true,
    priceRange: '$',
    color: '#d97706',
    initials: 'CN',
    hasVideo: false,
  },
];
