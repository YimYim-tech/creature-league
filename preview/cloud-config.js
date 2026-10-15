// The online users (cloud.js): the Firebase project creature-league (Spark plan; Authentication with Email/Password, Firestore in eur3).
// Its web config, three plain strings from the Firebase console. They are public by design: they name the project, and what guards the
// data is firestore.rules and the browser key's limits (only the published game's address, only the three APIs it needs).
// Nothing secret goes here; the public build refuses this file if it holds anything else. null hides the online users again.
// The game uses this project only from the published https site (cloud.cloudFor); on this computer it stays local, and tests use a fake.
// A change here needs a new CACHE name in sw.js, or phones that already have the game keep the old file.
export const CLOUD={apiKey:'AIzaSyAkl0VuN2B8z6Pgg-YxD43o_yVc0A5FsWk',projectId:'creature-league',authDomain:'creature-league.firebaseapp.com'};
