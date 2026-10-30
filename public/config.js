// Konfiguracja Firebase – jedyny plik, który uzupełniasz ręcznie.
// Firebase → ⚙️ Ustawienia projektu → Ogólne → Twoje aplikacje → (aplikacja Web) → Konfiguracja SDK
self.SQUAD_CONFIG = {
  apiKey: "AIzaSyC8fKKVOkbCo5d3Yc5ZknZdBDuP6pxxlHo",
  authDomain: "squad-64cd5.firebaseapp.com",
  projectId: "squad-64cd5",
  appId: "1:304109366668:web:91e1a68961e836cf17faa9",
  messagingSenderId: "304109366668",
  // Ustawienia projektu → Cloud Messaging → Certyfikaty Web Push → Wygeneruj parę kluczy → skopiuj „Para kluczy”
  vapidKey: "BFiu1P0-7_MRNZNnsJE5trAYTuwdBdmA5VUndlWr2C-0nVDBAXSOu8Rrkm4pWwHJ_QpkyINwU4P6GLtNiwcZIs0"
  // Plan darmowy (Spark): zdjęcia zapisują się w bazie Firestore. Po przejściu na Blaze dopisz tu storageBucket, a zdjęcia pójdą do Storage.
};
