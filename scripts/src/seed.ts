import { db, citiesTable, placesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(citiesTable).where(eq(citiesTable.name, "Ciénaga"));
  if (existing.length > 0) {
    console.log("Data already seeded, skipping.");
    process.exit(0);
  }

  const [cienaga] = await db.insert(citiesTable).values({
    name: "Ciénaga",
    department: "Magdalena",
    country: "Colombia",
    description: "Ciudad histórica del Caribe colombiano, conocida por su arquitectura republicana, cultura vallenata y su cercanía a la Sierra Nevada de Santa Marta.",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cienaga_Magdalena.jpg/1280px-Cienaga_Magdalena.jpg",
  }).returning();

  console.log(`Created city: ${cienaga.name} (id: ${cienaga.id})`);

  const places = [
    {
      cityId: cienaga.id,
      name: "Plaza del Centenario",
      shortDescription: "La plaza principal de Ciénaga, centro histórico y cultural de la ciudad, declarada Bien de Interés Cultural.",
      history: "La Plaza del Centenario de Ciénaga es el corazón histórico de la ciudad y uno de los espacios públicos más emblemáticos del Caribe colombiano. Fue construida a finales del siglo XIX para conmemorar el primer centenario de la Independencia de Colombia. Su diseño arquitectónico refleja la influencia europea, característica del auge bananero que vivió la región a principios del siglo XX, cuando familias adineradas mandaban a construir mansiones republicanas con fachadas de hierro importado de Europa. En la plaza se erigen esculturas históricas, palmeras reales y un kiosco central donde durante décadas se han celebrado festivales de música vallenata, ferias y eventos culturales que hacen parte de la identidad del municipio. La plaza fue testigo de eventos históricos cruciales, incluyendo manifestaciones y celebraciones que marcaron la vida política y social de la región bananera.",
      imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800",
      latitude: 11.0055,
      longitude: -74.2487,
      qrCode: "TURISCAN-CIENAGA-001",
      category: "Plaza",
      visitHours: "Abierta 24 horas",
      visitDuration: "30 - 60 minutos",
    },
    {
      cityId: cienaga.id,
      name: "Catedral de San Juan Bautista",
      shortDescription: "Majestuosa catedral neoclásica del siglo XIX, símbolo religioso y arquitectónico de Ciénaga.",
      history: "La Catedral de San Juan Bautista de Ciénaga es una de las joyas arquitectónicas más importantes del Caribe colombiano. Su construcción comenzó en 1840 sobre los cimientos de una ermita colonial del siglo XVII, y fue finalizada a principios del siglo XX. El edificio presenta un estilo neoclásico influenciado por las corrientes europeas que dominaban la arquitectura religiosa de la época. Sus torres gemelas dominan el horizonte urbano de Ciénaga y se han convertido en el símbolo icónico de la ciudad. Durante la época del auge bananero, la catedral recibió donaciones de familias pudientes de la región que financiaron su ornamentación interior, incluyendo vitral importados de Europa y un retablo mayor de madera fina. La catedral ha sido el escenario de los grandes eventos de la vida civil y religiosa de la ciudad durante más de un siglo, siendo un punto de encuentro y referencia para toda la comunidad ciénaguera.",
      imageUrl: "https://images.unsplash.com/photo-1548625149-720754c2285a?w=800",
      latitude: 11.0059,
      longitude: -74.2490,
      qrCode: "TURISCAN-CIENAGA-002",
      category: "Religioso",
      visitHours: "7:00 AM - 6:00 PM",
      visitDuration: "20 - 45 minutos",
    },
    {
      cityId: cienaga.id,
      name: "Malecón de Ciénaga",
      shortDescription: "Paseo marítimo frente al mar Caribe, punto de encuentro y recreación de los ciénagueros.",
      history: "El Malecón de Ciénaga es una hermosa avenida costera que bordea las aguas cálidas del Mar Caribe, extendiéndose a lo largo de varios kilómetros frente a la ciudad. Este paseo marítimo fue construido y remodelado en diferentes etapas durante el siglo XX, convirtiéndose en el principal espacio de esparcimiento y socialización de los ciénagueros. A lo largo del malecón se pueden encontrar quioscos de comida típica donde se sirven platos tradicionales como el sancocho de pescado, el mote de queso y las arepas de huevo. El malecón también es famoso por sus hermosos atardeceres sobre el mar, cuando el cielo se tiñe de colores cálidos y los pescadores regresan con sus embarcaciones cargadas de pargo, róbalo y otros frutos del mar. Durante festividades como el Carnaval del Caimán, el malecón se convierte en el epicentro de las celebraciones culturales más importantes de la región.",
      imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
      latitude: 11.0040,
      longitude: -74.2510,
      qrCode: "TURISCAN-CIENAGA-003",
      category: "Natural",
      visitHours: "Abierto 24 horas",
      visitDuration: "1 - 2 horas",
    },
    {
      cityId: cienaga.id,
      name: "Cementerio Central de Ciénaga",
      shortDescription: "Patrimonio arquitectónico que guarda la historia de las familias más importantes de la ciudad y la región.",
      history: "El Cementerio Central de Ciénaga es considerado uno de los cementerios más bellos y arquitectónicamente ricos del Caribe colombiano. Fundado en el siglo XIX, alberga mausoleos y tumbas de las familias más prominentes de la época bananera, muchas de ellas construidas por artesanos italianos y alemanes que llegaron a la región atraídos por la bonanza económica. Las construcciones presentan una mezcla de estilos que va desde el neoclásico hasta el art déco, con esculturas de mármol importadas de Italia, verjas de hierro forjado y epitafios que cuentan las historias de una época dorada. Entre sus muertos ilustres se encuentran personalidades que marcaron la historia de la región bananera, incluyendo empresarios, políticos y artistas. El lugar fue declarado Bien de Interés Cultural por su valor patrimonial y es visitado tanto por investigadores históricos como por turistas interesados en la arquitectura funeraria.",
      imageUrl: "https://images.unsplash.com/photo-1601132359864-c974e79890ac?w=800",
      latitude: 11.0070,
      longitude: -74.2460,
      qrCode: "TURISCAN-CIENAGA-004",
      category: "Patrimonio",
      visitHours: "8:00 AM - 5:00 PM",
      visitDuration: "45 - 90 minutos",
    },
    {
      cityId: cienaga.id,
      name: "Casa de la Cultura",
      shortDescription: "Centro cultural donde se preserva y difunde el patrimonio artístico e histórico de Ciénaga.",
      history: "La Casa de la Cultura de Ciénaga ocupa una hermosa casona republicana construida a principios del siglo XX durante la época del auge bananero. Este tipo de arquitectura, caracterizada por sus amplios corredores, patios internos y fachadas ornamentadas con elementos de hierro forjado traídos de Europa, era típica de las familias adineradas de la época. La edificación fue adquirida por el municipio y transformada en centro cultural en la segunda mitad del siglo XX, convirtiéndose en el principal espacio para la preservación y difusión del patrimonio cultural de Ciénaga. Actualmente alberga una biblioteca municipal, salas de exposición donde se exhiben obras de artistas locales y regionales, y espacios para talleres de música vallenata, danza cumbia y artes plásticas. La Casa de la Cultura es también el punto de referencia para investigadores que estudian la historia de la región bananera, pues conserva un archivo histórico con documentos, fotografías y testimonios de la época.",
      imageUrl: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=800",
      latitude: 11.0048,
      longitude: -74.2475,
      qrCode: "TURISCAN-CIENAGA-005",
      category: "Cultural",
      visitHours: "8:00 AM - 6:00 PM (Lun-Vie)",
      visitDuration: "30 - 60 minutos",
    },
  ];

  for (const place of places) {
    const [created] = await db.insert(placesTable).values(place).returning();
    console.log(`Created place: ${created.name} (qrCode: ${created.qrCode})`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
