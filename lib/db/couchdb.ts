import nano from 'nano';

const couchdbUrl = process.env.COUCHDB_URL || 'http://admin:password@localhost:5984';

// Create a singleton instance
const couch = nano(couchdbUrl);

export const dbName = 'techaxon_auth';

export const getDb = async () => {
  try {
    const dbList = await couch.db.list();
    if (!dbList.includes(dbName)) {
      await couch.db.create(dbName);
    }
  } catch (error) {
    console.error('Error ensuring CouchDB database exists:', error);
  }
  return couch.use(dbName);
};

export default couch;
