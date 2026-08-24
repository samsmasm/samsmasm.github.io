/* newbiz — word buckets.
 *
 * Every word here should be a CONCRETE, IMAGEABLE, EVERYDAY noun. That is the
 * whole trick: "blueberry + helmet" works because both words put a picture in
 * your head. Abstract nouns kill the effect, so they do not belong in here.
 *
 * The generator draws each reel from a DIFFERENT bucket, so the buckets are
 * doing real work — they are what stops you getting "otter + badger".
 *
 * Adding words: keep them concrete, singular, common, and safe next to ANY
 * other word on the list (that symmetric test is what keeps it classroom-safe).
 * Avoid: double meanings, brands, proper nouns, weapons, alcohol, gambling,
 * body parts, anything medical or political.
 */

const BUCKETS = {
  food: {
    label: 'Food & drink',
    words: [
      'blueberry', 'sourdough', 'chilli', 'porridge', 'mango', 'popcorn',
      'noodle', 'pancake', 'olive', 'walnut', 'cinnamon', 'lemonade',
      'dumpling', 'pumpkin', 'avocado', 'marshmallow', 'pretzel', 'custard',
      'seaweed', 'apricot', 'gingerbread', 'waffle', 'coconut', 'parsnip',
      'honey', 'oatmeal', 'salsa', 'tofu', 'cheddar', 'croissant', 'granola',
      'plum', 'cucumber', 'marmalade', 'tangerine', 'hummus', 'pesto',
      'syrup', 'rhubarb', 'cornflake', 'smoothie', 'toffee', 'lentil',
      'watermelon', 'shortbread', 'peppermint'
    ]
  },

  animals: {
    label: 'Animals',
    words: [
      'otter', 'magpie', 'bee', 'tortoise', 'alpaca', 'penguin', 'hedgehog',
      'seagull', 'dolphin', 'ferret', 'moth', 'kingfisher', 'badger', 'llama',
      'octopus', 'wombat', 'sparrow', 'jellyfish', 'gecko', 'squirrel',
      'heron', 'chameleon', 'pelican', 'mole', 'starfish', 'owl', 'crab',
      'goldfish', 'raccoon', 'flamingo', 'snail', 'beetle', 'kiwi',
      'mongoose', 'walrus', 'puffin', 'salamander', 'hamster', 'toucan',
      'lobster', 'koala', 'moose', 'swan', 'lizard', 'panda', 'meerkat'
    ]
  },

  wear: {
    label: 'Clothing & wearables',
    words: [
      'helmet', 'sock', 'raincoat', 'mitten', 'scarf', 'wellington', 'apron',
      'backpack', 'cardigan', 'shoelace', 'hoodie', 'beanie', 'sandal',
      'poncho', 'glove', 'sunhat', 'waistcoat', 'overall', 'tracksuit',
      'slipper', 'wristband', 'goggles', 'earmuff', 'bowtie', 'kilt',
      'anorak', 'jumpsuit', 'sneaker', 'visor', 'shawl', 'cufflink',
      'kneepad', 'snowsuit', 'lanyard', 'tutu', 'cape', 'headband', 'boot',
      'buckle', 'zipper', 'dressing gown', 'flip-flop', 'watch strap',
      'name badge', 'shoulder bag'
    ]
  },

  tools: {
    label: 'Tools & hardware',
    words: [
      'ladder', 'drill', 'zip tie', 'spanner', 'hammer', 'wheelbarrow',
      'sandpaper', 'clamp', 'screwdriver', 'spirit level', 'tape measure',
      'chisel', 'pulley', 'funnel', 'hinge', 'bolt', 'trowel', 'wrench',
      'stepladder', 'toolbox', 'workbench', 'ratchet', 'dowel', 'caster',
      'bracket', 'magnet', 'spring', 'gasket', 'sprocket', 'cog', 'lever',
      'winch', 'anvil', 'bellows', 'glue gun', 'staple', 'rivet', 'washer',
      'nozzle', 'valve', 'gauge', 'scaffold', 'extension lead', 'padlock',
      'watering can'
    ]
  },

  household: {
    label: 'Household objects',
    words: [
      'kettle', 'doormat', 'lampshade', 'teapot', 'coat hanger', 'bookshelf',
      'cushion', 'ironing board', 'colander', 'bread bin', 'laundry basket',
      'doorbell', 'keyring', 'mousepad', 'toaster', 'dustpan', 'wardrobe',
      'mirror', 'curtain', 'radiator', 'letterbox', 'alarm clock', 'bath mat',
      'whisk', 'chopping board', 'tablecloth', 'coaster', 'vase',
      'bird feeder', 'step stool', 'drawer', 'mattress', 'pillowcase',
      'thermos', 'lunchbox', 'kitchen timer', 'spice rack', 'shoe rack',
      'candle', 'photo frame', 'houseplant', 'footstool', 'washing line',
      'fridge magnet', 'bin bag'
    ]
  },

  sport: {
    label: 'Sport & hobbies',
    words: [
      'kayak', 'skateboard', 'chess', 'trampoline', 'badminton', 'knitting',
      'origami', 'bowling', 'yoga', 'surfing', 'karaoke', 'roller skate',
      'frisbee', 'dominoes', 'jigsaw', 'birdwatching', 'gardening', 'pottery',
      'juggling', 'fishing rod', 'snorkel', 'tent', 'campfire', 'hopscotch',
      'hula hoop', 'marbles', 'scrapbook', 'skipping rope', 'netball',
      'cricket bat', 'golf ball', 'tennis racquet', 'swimming cap',
      'table tennis', 'unicycle', 'sledge', 'ice skate', 'paddleboard',
      'climbing rope', 'dumbbell', 'whistle', 'scoreboard', 'stopwatch',
      'shin pad', 'kite'
    ]
  },

  transport: {
    label: 'Transport',
    words: [
      'tram', 'ferry', 'cargo bike', 'scooter', 'hot air balloon', 'rickshaw',
      'gondola', 'canoe', 'tractor', 'forklift', 'cable car', 'hovercraft',
      'tandem', 'campervan', 'minibus', 'sidecar', 'submarine', 'glider',
      'dinghy', 'moped', 'sleigh', 'suitcase', 'trolley', 'escalator',
      'zipline', 'ski lift', 'monorail', 'horsebox', 'pushchair', 'tugboat',
      'freight train', 'rowboat', 'snowplough', 'taxi', 'milk float',
      'golf cart', 'pedal boat', 'houseboat', 'catamaran', 'roof rack',
      'wheelchair', 'delivery van', 'night bus', 'cycle lane'
    ]
  },

  materials: {
    label: 'Materials',
    words: [
      'bamboo', 'concrete', 'wool', 'cork', 'denim', 'rubber', 'clay', 'felt',
      'marble', 'brass', 'tinfoil', 'cardboard', 'velvet', 'plywood',
      'glitter', 'wax', 'linen', 'slate', 'charcoal', 'rope', 'sand',
      'seagrass', 'leather', 'glass', 'ceramic', 'papier-mache', 'lace',
      'mesh', 'foam', 'gravel', 'straw', 'silk', 'copper', 'chalk', 'resin',
      'thatch', 'tarpaulin', 'canvas', 'sawdust', 'bubble wrap', 'wicker',
      'terracotta', 'aluminium', 'recycled plastic', 'rope twine'
    ]
  },

  places: {
    label: 'Places & spaces',
    words: [
      'rooftop', 'car park', 'library', 'lighthouse', 'greenhouse', 'attic',
      'allotment', 'laundrette', 'ferry terminal', 'bus shelter', 'campsite',
      'treehouse', 'cellar', 'courtyard', 'pier', 'marketplace', 'warehouse',
      'barn', 'garden shed', 'corridor', 'stairwell', 'balcony', 'museum',
      'swimming pool', 'ice rink', 'quarry', 'harbour', 'footbridge',
      'village hall', 'petrol station', 'waiting room', 'playground',
      'orchard', 'bandstand', 'boatshed', 'cul-de-sac', 'roundabout',
      'cloakroom', 'back garden', 'market stall', 'food truck', 'sports hall',
      'tunnel', 'canal', 'hillside'
    ]
  },

  nature: {
    label: 'Nature & weather',
    words: [
      'fog', 'glacier', 'tide', 'thunderstorm', 'drizzle', 'frost', 'sunrise',
      'monsoon', 'rainbow', 'hailstone', 'geyser', 'tumbleweed', 'waterfall',
      'volcano', 'eclipse', 'puddle', 'snowdrift', 'heatwave', 'whirlpool',
      'mist', 'breeze', 'lightning', 'meteor', 'dewdrop', 'icicle', 'sunbeam',
      'wildflower', 'pinecone', 'driftwood', 'seashell', 'coral reef',
      'mushroom', 'fern', 'cobweb', 'beehive', 'anthill', 'birdsong',
      'autumn leaf', 'low tide', 'full moon', 'northern lights', 'sandstorm',
      'rockpool', 'moss', 'sand dune'
    ]
  }
};

/* Constraints are a different KIND of prompt. A second noun gives you a thing;
 * a constraint gives you a problem. "helmet + rooftop" is a product idea,
 * "helmet + rooftop + must cost under $5 to make" is a business case, because
 * now there is a trade-off to argue about.
 *
 * Keep these short, testable, and genuinely restrictive. A constraint that
 * anything satisfies is not a constraint. */
const CONSTRAINTS = [
  'must cost under $5 to make',
  'must work with no electricity',
  'can only be sold at night',
  'the customer is over 70',
  'the customer is under 8',
  'must survive being dropped in water',
  'no plastic anywhere in it',
  'must fit in a coat pocket',
  'can only be sold face to face',
  'must be shipped flat',
  'the whole business has one employee',
  'you cannot advertise online',
  'must be reusable 100 times',
  'must be usable with one hand',
  'only sells in winter',
  'only sells in a town of 2,000 people',
  'must be made entirely from waste',
  'the customer never sees the product',
  'must break even in six weeks',
  'no premises, ever',
  'must be silent in use',
  'the customer cannot read the label',
  'must be assembled by the buyer',
  'you have to rent it, not sell it',
  'must be legal to take on a plane',
  'sells only through schools',
  'must work in a power cut',
  'the buyer and the user are different people',
  'must be delivered within one hour',
  'no returns are possible',
  'must be carried on a bicycle',
  'the supplier can only be local',
  'must be understandable without words',
  'only one size is ever made',
  'must run on a subscription',
  'customers pay after they use it',
  'must be stackable',
  'has to work in heavy rain',
  'the packaging is the product',
  'must be profitable at ten units a week'
];
