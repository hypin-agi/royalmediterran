/**
 * Magyar városok hozzávetőleges központi koordinátái.
 *
 * Kizárólag arra használjuk, hogy a lefedettségi térképen a megtalált
 * parkolási zónákat a legközelebbi ismert városhoz soroljuk. A koordináták
 * tájékoztató jellegűek (városközpont), nem közigazgatási határok — a
 * besorolás ezért „legközelebbi város", nem „ebben a városban van".
 */
export type City = { name: string; lat: number; lon: number };

export const CITIES: City[] = [
  { name: "Budapest", lat: 47.4979, lon: 19.0546 },
  { name: "Debrecen", lat: 47.5316, lon: 21.6273 },
  { name: "Szeged", lat: 46.253, lon: 20.1414 },
  { name: "Miskolc", lat: 48.1035, lon: 20.7784 },
  { name: "Pécs", lat: 46.0727, lon: 18.2323 },
  { name: "Győr", lat: 47.6875, lon: 17.6504 },
  { name: "Nyíregyháza", lat: 47.9554, lon: 21.7167 },
  { name: "Kecskemét", lat: 46.8964, lon: 19.6897 },
  { name: "Székesfehérvár", lat: 47.1861, lon: 18.4221 },
  { name: "Szombathely", lat: 47.2307, lon: 16.6218 },
  { name: "Szolnok", lat: 47.1747, lon: 20.1986 },
  { name: "Tatabánya", lat: 47.5692, lon: 18.3981 },
  { name: "Kaposvár", lat: 46.3594, lon: 17.7968 },
  { name: "Békéscsaba", lat: 46.6836, lon: 21.0877 },
  { name: "Veszprém", lat: 47.0933, lon: 17.9115 },
  { name: "Zalaegerszeg", lat: 46.8417, lon: 16.8416 },
  { name: "Eger", lat: 47.9026, lon: 20.3772 },
  { name: "Sopron", lat: 47.6817, lon: 16.5845 },
  { name: "Nagykanizsa", lat: 46.4547, lon: 16.9897 },
  { name: "Dunaújváros", lat: 46.9619, lon: 18.9355 },
  { name: "Hódmezővásárhely", lat: 46.4181, lon: 20.324 },
  { name: "Salgótarján", lat: 48.0935, lon: 19.8005 },
  { name: "Cegléd", lat: 47.1747, lon: 19.7997 },
  { name: "Baja", lat: 46.1806, lon: 18.9542 },
  { name: "Esztergom", lat: 47.7928, lon: 18.7406 },
  { name: "Siófok", lat: 46.9046, lon: 18.058 },
  { name: "Balatonfüred", lat: 46.9591, lon: 17.8917 },
  { name: "Keszthely", lat: 46.7686, lon: 17.2437 },
  { name: "Hévíz", lat: 46.7897, lon: 17.1885 },
  { name: "Gyula", lat: 46.6455, lon: 21.2777 },
  { name: "Szentendre", lat: 47.6695, lon: 19.0757 },
  { name: "Gödöllő", lat: 47.5964, lon: 19.3592 },
  { name: "Vác", lat: 47.7757, lon: 19.1345 },
  { name: "Érd", lat: 47.3919, lon: 18.9136 },
  { name: "Sárvár", lat: 47.2537, lon: 16.9377 },
  { name: "Mosonmagyaróvár", lat: 47.8679, lon: 17.2718 },
  { name: "Ózd", lat: 48.2206, lon: 20.2903 },
  { name: "Pápa", lat: 47.3297, lon: 17.4664 },
  { name: "Kiskunfélegyháza", lat: 46.7126, lon: 19.8506 },
  { name: "Szekszárd", lat: 46.3474, lon: 18.7062 },
];

/** Magyarország hozzávetőleges befoglaló téglalapja a térkép kezdőnézetéhez. */
export const HUNGARY_BOUNDS = {
  south: 45.74,
  west: 16.11,
  north: 48.59,
  east: 22.9,
};
