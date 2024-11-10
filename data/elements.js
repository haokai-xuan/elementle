const elements = [
  {name: 'Hydrogen', atomicNumber: 1, family: 'Nonmetal', hint: 'Most abundant element in the universe.', symbol: 'H'},
  {name: 'Helium', atomicNumber: 2, family: 'Noble Gas', hint: 'Used to fill balloons and airships.', symbol: 'He'},
  {name: 'Lithium', atomicNumber: 3, family: 'Alkali Metal', hint: 'Used in rechargeable batteries.', symbol: 'Li'},
  {name: 'Beryllium', atomicNumber: 4, family: 'Alkaline Earth Metal', hint: 'Commonly used in alloys.', symbol: 'Be'},
  {name: 'Boron', atomicNumber: 5, family: 'Metalloid', hint: 'Used in heat-resistant glass.', symbol: 'B'},
  {name: 'Carbon', atomicNumber: 6, family: 'Nonmetal', hint: 'Forms the basis of organic chemistry.', symbol: 'C'},
  {name: 'Nitrogen', atomicNumber: 7, family: 'Nonmetal', hint: 'Makes up most of Earth\'s atmosphere.', symbol: 'N'},
  {name: 'Oxygen', atomicNumber: 8, family: 'Nonmetal', hint: 'Essential for respiration and combustion.', symbol: 'O'},
  {name: 'Fluorine', atomicNumber: 9, family: 'Halogen', hint: 'Used in toothpaste and water fluoridation.', symbol: 'F'},
  {name: 'Neon', atomicNumber: 10, family: 'Noble Gas', hint: 'Produces a distinctive red-orange glow.', symbol: 'Ne'},
  {name: 'Sodium', atomicNumber: 11, family: 'Alkali Metal', hint: 'Reacts violently with water.', symbol: 'Na'},
  {name: 'Magnesium', atomicNumber: 12, family: 'Alkaline Earth Metal', hint: 'Used in alloys and as a structural metal.', symbol: 'Mg'},
  {name: 'Aluminum', atomicNumber: 13, family: 'Metal', hint: 'Commonly used in cans and foil.', symbol: 'Al'},
  {name: 'Silicon', atomicNumber: 14, family: 'Metalloid', hint: 'Primary component of computer chips.', symbol: 'Si'},
  {name: 'Phosphorus', atomicNumber: 15, family: 'Nonmetal', hint: 'Essential for life, found in DNA.', symbol: 'P'},
  {name: 'Sulfur', atomicNumber: 16, family: 'Nonmetal', hint: 'Forms compounds with a characteristic smell.', symbol: 'S'},
  {name: 'Chlorine', atomicNumber: 17, family: 'Halogen', hint: 'Used to disinfect water and as a bleach.', symbol: 'Cl'},
  {name: 'Argon', atomicNumber: 18, family: 'Noble Gas', hint: 'Used in light bulbs and welding.', symbol: 'Ar'},
  {name: 'Potassium', atomicNumber: 19, family: 'Alkali Metal', hint: 'Important for nerve function in living organisms.', symbol: 'K'},
  {name: 'Calcium', atomicNumber: 20, family: 'Alkaline Earth Metal', hint: 'Essential for bone and teeth health.', symbol: 'Ca'},
  {name: 'Scandium', atomicNumber: 21, family: 'Transition Metal', hint: 'Used in aerospace and sporting goods.', symbol: 'Sc'},
  {name: 'Titanium', atomicNumber: 22, family: 'Transition Metal', hint: 'Known for its high strength-to-weight ratio.', symbol: 'Ti'},
  {name: 'Vanadium', atomicNumber: 23, family: 'Transition Metal', hint: 'Used in steel alloys for strength.', symbol: 'V'},
  {name: 'Chromium', atomicNumber: 24, family: 'Transition Metal', hint: 'Adds hardness and corrosion resistance to steel.', symbol: 'Cr'},
  {name: 'Manganese', atomicNumber: 25, family: 'Transition Metal', hint: 'Used in steelmaking and batteries.', symbol: 'Mn'},
  {name: 'Iron', atomicNumber: 26, family: 'Transition Metal', hint: 'Found in blood and used in construction.', symbol: 'Fe'},
  {name: 'Cobalt', atomicNumber: 27, family: 'Transition Metal', hint: 'Used in magnets and rechargeable batteries.', symbol: 'Co'},
  {name: 'Nickel', atomicNumber: 28, family: 'Transition Metal', hint: 'Used in coins, stainless steel, and magnets.', symbol: 'Ni'},
  {name: 'Copper', atomicNumber: 29, family: 'Transition Metal', hint: 'Used in electrical wiring and plumbing.', symbol: 'Cu'},
  {name: 'Zinc', atomicNumber: 30, family: 'Transition Metal', hint: 'Used to coat iron to prevent rusting.', symbol: 'Zn'},
  {name: 'Gallium', atomicNumber: 31, family: 'Metal', hint: 'Used in semiconductors and LEDs.', symbol: 'Ga'},
  {name: 'Germanium', atomicNumber: 32, family: 'Metalloid', hint: 'Used in early transistors and fiber optics.', symbol: 'Ge'},
  {name: 'Arsenic', atomicNumber: 33, family: 'Metalloid', hint: 'Historically used in poison and pesticides.', symbol: 'As'},
  {name: 'Selenium', atomicNumber: 34, family: 'Nonmetal', hint: 'Used in photocells and glassmaking.', symbol: 'Se'},
  {name: 'Bromine', atomicNumber: 35, family: 'Halogen', hint: 'Used in flame retardants and hot tubs.', symbol: 'Br'},
  {name: 'Krypton', atomicNumber: 36, family: 'Noble Gas', hint: 'Used in lasers and lighting.', symbol: 'Kr'},
  {name: 'Rubidium', atomicNumber: 37, family: 'Alkali Metal', hint: 'Used in atomic clocks and research.', symbol: 'Rb'},
  {name: 'Strontium', atomicNumber: 38, family: 'Alkaline Earth Metal', hint: 'Used in fireworks for red color.', symbol: 'Sr'},
  {name: 'Yttrium', atomicNumber: 39, family: 'Transition Metal', hint: 'Used in LEDs and superconductors.', symbol: 'Y'},
  {name: 'Zirconium', atomicNumber: 40, family: 'Transition Metal', hint: 'Used in nuclear reactors and ceramics.', symbol: 'Zr'},
  {name: 'Niobium', atomicNumber: 41, family: 'Transition Metal', hint: 'Used in superconductors and alloys.', symbol: 'Nb'},
  {name: 'Molybdenum', atomicNumber: 42, family: 'Transition Metal', hint: 'Used in steel alloys and lubricants.', symbol: 'Mo'},
  {name: 'Technetium', atomicNumber: 43, family: 'Transition Metal', hint: 'Radioactive and used in medical imaging.', symbol: 'Tc'},
  {name: 'Ruthenium', atomicNumber: 44, family: 'Transition Metal', hint: 'Used in electronics and jewelry.', symbol: 'Ru'},
  {name: 'Rhodium', atomicNumber: 45, family: 'Transition Metal', hint: 'Used in catalytic converters and jewelry.', symbol: 'Rh'},
  {name: 'Palladium', atomicNumber: 46, family: 'Transition Metal', hint: 'Used in N  lytic converters and electronics.', symbol: 'Pd'},
  {name: 'Silver', atomicNumber: 47, family: 'Transition Metal', hint: 'Used in coins, jewelry, and photography.', symbol: 'Ag'},
  {name: 'Cadmium', atomicNumber: 48, family: 'Transition Metal', hint: 'Used in batteries and pigments.', symbol: 'Cd'},
  {name: 'Indium', atomicNumber: 49, family: 'Metal', hint: 'Used in electronics and LCD screens.', symbol: 'In'},
  {name: 'Tin', atomicNumber: 50, family: 'Metal', hint: 'Used in cans and as a coating for other metals.', symbol: 'Sn'},
  {name: 'Antimony', atomicNumber: 51, family: 'Metalloid', hint: 'Used in flame retardants and batteries.', symbol: 'Sb'},
  {name: 'Tellurium', atomicNumber: 52, family: 'Metalloid', hint: 'Used in alloys and solar cells.', symbol: 'Te'},
  {name: 'Iodine', atomicNumber: 53, family: 'Halogen', hint: 'Used in medicine and to disinfect water.', symbol: 'I'},
  {name: 'Xenon', atomicNumber: 54, family: 'Noble Gas', hint: 'Used in lamps and anesthesia.', symbol: 'Xe'},
  {name: 'Cesium', atomicNumber: 55, family: 'Alkali Metal', hint: 'Used in atomic clocks and research.', symbol: 'Cs'},
  {name: 'Barium', atomicNumber: 56, family: 'Alkaline Earth Metal', hint: 'Used in x-ray imaging and fireworks.', symbol: 'Ba'},
  {name: 'Lanthanum', atomicNumber: 57, family: 'Lanthanide', hint: 'Used in high-strength alloys and cameras.', symbol: 'La'},
  {name: 'Cerium', atomicNumber: 58, family: 'Lanthanide', hint: 'Used in catalytic converters and glass.', symbol: 'Ce'},
  {name: 'Praseodymium', atomicNumber: 59, family: 'Lanthanide', hint: 'Used in magnets and lasers.', symbol: 'Pr'},
  {name: 'Neodymium', atomicNumber: 60, family: 'Lanthanide', hint: 'Used in magnets and lasers.', symbol: 'Nd'},
  {name: 'Promethium', atomicNumber: 61, family: 'Lanthanide', hint: 'Radioactive and used in nuclear batteries.', symbol: 'Pm'},
  {name: 'Samarium', atomicNumber: 62, family: 'Lanthanide', hint: 'Used in magnets and nuclear reactors.', symbol: 'Sm'},
  {name: 'Europium', atomicNumber: 63, family: 'Lanthanide', hint: 'Used in phosphors and security features.', symbol: 'Eu'},
  {name: 'Gadolinium', atomicNumber: 64, family: 'Lanthanide', hint: 'Used in MRI contrast agents and nuclear reactors.', symbol: 'Gd'},
  {name: 'Terbium', atomicNumber: 65, family: 'Lanthanide', hint: 'Used in fluorescent lamps and lasers.', symbol: 'Tb'},
  {name: 'Dysprosium', atomicNumber: 66, family: 'Lanthanide', hint: 'Used in magnets and lasers.', symbol: 'Dy'},
  {name: 'Holmium', atomicNumber: 67, family: 'Lanthanide', hint: 'Used in magnets and lasers.', symbol: 'Ho'},
  {name: 'Erbium', atomicNumber: 68, family: 'Lanthanide', hint: 'Used in lasers and fiber optics.', symbol: 'Er'},
  {name: 'Thulium', atomicNumber: 69, family: 'Lanthanide', hint: 'Used in portable X-ray machines and lasers.', symbol: 'Tm'},
  {name: 'Ytterbium', atomicNumber: 70, family: 'Lanthanide', hint: 'Used as source of gamma ray and in atomic clocks.', symbol: 'Yb'},
  {name: 'Lutetium', atomicNumber: 71, family: 'Lanthanide', hint: 'Used in cancer treatment and LED lighting.', symbol: 'Lu'},
  {name: 'Hafnium', atomicNumber: 72, family: 'Transition Metal', hint: 'Used in nuclear reactors and alloys.', symbol: 'Hf'},
  {name: 'Tantalum', atomicNumber: 73, family: 'Transition Metal', hint: 'Used in electronics and surgical implants.', symbol: 'Ta'},
  {name: 'Tungsten', atomicNumber: 74, family: 'Transition Metal', hint: 'Known for its high melting point and use in light bulbs.', symbol: 'W'},
  {name: 'Rhenium', atomicNumber: 75, family: 'Transition Metal', hint: 'Used in high-temperature superalloys.', symbol: 'Re'},
  {name: 'Osmium', atomicNumber: 76, family: 'Transition Metal', hint: 'Densest naturally occurring element.', symbol: 'Os'},
  {name: 'Iridium', atomicNumber: 77, family: 'Transition Metal', hint: 'Used in spark plugs and jewelry.', symbol: 'Ir'},
  {name: 'Platinum', atomicNumber: 78, family: 'Transition Metal', hint: 'Used in jewelry, catalytic converters, and fuel cells.', symbol: 'Pt'},
  {name: 'Gold', atomicNumber: 79, family: 'Transition Metal', hint: 'Highly valued for its rarity and use in jewelry.', symbol: 'Au'},
  {name: 'Mercury', atomicNumber: 80, family: 'Transition Metal', hint: 'Liquid at room temperature, historically used in thermometers.', symbol: 'Hg'},
  {name: 'Thallium', atomicNumber: 81, family: 'Metal', hint: 'Highly toxic, once used in rat poisons.', symbol: 'Tl'},
  {name: 'Lead', atomicNumber: 82, family: 'Metal', hint: 'Used in batteries, pipes, and as a shield against radiation.', symbol: 'Pb'},
  {name: 'Bismuth', atomicNumber: 83, family: 'Metal', hint: 'Used in pharmaceuticals and cosmetics.', symbol: 'Bi'},
  {name: 'Polonium', atomicNumber: 84, family: 'Metal', hint: 'Highly radioactive and toxic.', symbol: 'Po'},
  {name: 'Astatine', atomicNumber: 85, family: 'Halogen', hint: 'Radioactive and extremely rare in nature.', symbol: 'At'},
  {name: 'Radon', atomicNumber: 86, family: 'Noble Gas', hint: 'Radioactive and naturally occurring.', symbol: 'Rn'},
  {name: 'Francium', atomicNumber: 87, family: 'Alkali Metal', hint: 'Extremely rare and highly radioactive.', symbol: 'Fr'},
  {name: 'Radium', atomicNumber: 88, family: 'Alkaline Earth Metal', hint: 'Radioactive, once used in luminous paint.', symbol: 'Ra'},
  {name: 'Actinium', atomicNumber: 89, family: 'Actinide', hint: 'Radioactive, once used in self-luminous paint.', symbol: 'Ac'},
  {name: 'Thorium', atomicNumber: 90, family: 'Actinide', hint: 'Radioactive, once used in lantern mantles.', symbol: 'Th'},
  { name: 'Protactinium', atomicNumber: 91, family: 'Actinide', hint: 'Radioactive metal, used in nuclear reactors and some research applications.', symbol: 'Pa' },
  { name: 'Uranium', atomicNumber: 92, family: 'Actinide', hint: 'Widely used in nuclear power generation and weaponry.', symbol: 'U' },
  { name: 'Neptunium', atomicNumber: 93, family: 'Actinide', hint: 'Synthetic radioactive element, used in nuclear research and fuel.', symbol: 'Np' },
  { name: 'Plutonium', atomicNumber: 94, family: 'Actinide', hint: 'Highly radioactive, used in nuclear weapons and as a fuel in some reactors.', symbol: 'Pu' },
  { name: 'Americium', atomicNumber: 95, family: 'Actinide', hint: 'Commonly found in smoke detectors, emitting alpha particles.', symbol: 'Am' },
  { name: 'Curium', atomicNumber: 96, family: 'Actinide', hint: 'Synthetic element, named after famous polish-french female chemist.', symbol: 'Cm' },
  { name: 'Berkelium', atomicNumber: 97, family: 'Actinide', hint: 'Produced in nuclear reactors, used in target irradiation experiments.', symbol: 'Bk' },
  { name: 'Californium', atomicNumber: 98, family: 'Actinide', hint: 'Highly radioactive, used in neutron source applications.', symbol: 'Cf' },
  { name: 'Einsteinium', atomicNumber: 99, family: 'Actinide', hint: 'Synthetic element, named after famous theoretical physicist', symbol: 'Es' },
  { name: 'Fermium', atomicNumber: 100, family: 'Actinide', hint: 'Synthetic element, used in research and neutron source applications.', symbol: 'Fm' },
  { name: 'Mendelevium', atomicNumber: 101, family: 'Actinide', hint: 'Synthetic element, named after the famous Russian chemist who formulated the first periodic table.', symbol: 'Md' },
  { name: 'Nobelium', atomicNumber: 102, family: 'Actinide', hint: 'Synthetic element, named after Swedish chemist and inventor.', symbol: 'No' },
  { name: 'Lawrencium', atomicNumber: 103, family: 'Actinide', hint: 'Synthetic element, used in particle physics experiments.', symbol: 'Lr' },
  { name: 'Rutherfordium', atomicNumber: 104, family: 'Transition Metal', hint: 'Synthetic radioactive element, named after New Zealand physicist.', symbol: 'Rf' },
  { name: 'Dubnium', atomicNumber: 105, family: 'Transition Metal', hint: 'Synthetic radioactive element, produced in particle accelerators.', symbol: 'Db' },
  { name: 'Seaborgium', atomicNumber: 106, family: 'Transition Metal', hint: 'Synthetic element, named after Glenn T. Seaborg, used in research.', symbol: 'Sg' },
  { name: 'Bohrium', atomicNumber: 107, family: 'Transition Metal', hint: 'Synthetic element, named after Danish physicist.', symbol: 'Bh' },
  { name: 'Hassium', atomicNumber: 108, family: 'Transition Metal', hint: 'Synthetic element, named after the German state of Hesse.', symbol: 'Hs' },
  { name: 'Meitnerium', atomicNumber: 109, family: 'Transition Metal', hint: 'Synthetic element, named after physicist Lise Meitner.', symbol: 'Mt' },
  { name: 'Darmstadtium', atomicNumber: 110, family: 'Transition Metal', hint: 'Synthetic element, named after the city of Darmstadt in Germany.', symbol: 'Ds' },
  { name: 'Roentgenium', atomicNumber: 111, family: 'Transition Metal', hint: 'Synthetic element, named after Wilhelm Conrad Roentgen.', symbol: 'Rg' },
  { name: 'Copernicium', atomicNumber: 112, family: 'Transition Metal', hint: 'Synthetic element, named after astronomer Nicolaus Copernicus.', symbol: 'Cn' },
  { name: 'Nihonium', atomicNumber: 113, family: 'Metal', hint: 'Synthetic element, named after Japan.', symbol: 'Nh' },
  { name: 'Flerovium', atomicNumber: 114, family: 'Metal', hint: 'Synthetic element, named after physicist Georgy Flyorov.', symbol: 'Fl' },
  { name: 'Moscovium', atomicNumber: 115, family: 'Metal', hint: 'Synthetic element, named after the capital of Russia.', symbol: 'Mc' },
  { name: 'Livermorium', atomicNumber: 116, family: 'Metal', hint: 'Synthetic element, named after the Lawrence Livermore National Laboratory.', symbol: 'Lv' },
  { name: 'Tennessine', atomicNumber: 117, family: 'Halogen', hint: 'Synthetic element, named after the state of Tennessee.', symbol: 'Ts' },
  { name: 'Oganesson', atomicNumber: 118, family: 'Noble Gas', hint: 'Synthetic element, named after physicist Yuri Oganessian.', symbol: 'Og' }  
];

elements.sort((a, b) => {
  return a.name.localeCompare(b.name);
});
