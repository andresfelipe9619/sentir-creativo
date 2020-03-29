exports = async function hook(payload) {
  const atlas = context.services.get("mongodb-atlas");
  const eventsdb = atlas.db("stoner-cluster");
  const mongoService = initMongoService(eventsdb);
  const { action, data } = payload.body;
  console.log("PAYLOAD ==>", stringify(payload));
  const result = handleAction(mongoService, { action, data });
  return result;
};

function stringify(data) {
  return JSON.stringify(data, false, false);
}

async function handleAction(mongoService, { action, data }) {
  let result = { data: null, message: "Could not execute action" };
  console.log("ACTION ==>", action);
  if (action === "read") {
    result = await mongoService.getServices();
  }
  if (action === "search") {
    result = await mongoService.searchService();
  }
  if (action === "latest") {
    result = await mongoService.getLatestServices();
  }
  if (action === "create") {
    result = await mongoService.createService();
  }
  if (action === "update") {
    result = await mongoService.updateService();
  }
  if (action === "delete") {
    result = await mongoService.deleteService(data);
  }
  console.log("RESULT ==>", stringify(result));
  return result;
}

function initMongoService(eventsdb) {
  // ============== Servicios para la coleccion de servicios ==============
  function getLatestServices() {
    const limit = 4;
    return getServices({ limit });
  }

  function searchService(query) {
    return findOneDocument(query);
  }

  function getServices(options) {
    return findDocuments({ collection: "services", ...options });
  }

  function deleteService({ id }) {
    const { deletedCount } = deleteDocument({ collection: "services", id });
    let result = { message: "Service deleted correctly", data: null };
    if (!deletedCount) result.message = "Looks like the service does not exist";
    return result;
  }

  function createService(options) {
    return createDocument({ collection: "services", ...options });
  }

  function updateService(options) {
    return updateDocument({ collection: "services", ...options });
  }

  // ============== Fin Servicios ==============

  // ============== CRUD generico para colecciones  ==============
  async function createDocument({ collection, props }) {
    const collectionService = eventsdb.collection(collection);
    const inserted = await collectionService.insertOne(props);
    const result = inserted.insertedId.toString();
    return result;
  }

  function findOneDocument({ collection, query = {} }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService.findOne(query);
  }

  function findDocuments({ collection, query = {}, limit }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService
      .find(query)
      .limit(limit || 20)
      .toArray();
  }

  function updateDocument({ collection, props }) {}

  function deleteDocument({ collection, id }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService.deleteOne({ _id: { $oid: id } });
  }

  // ============== Fin CRUD generico ==============
  return {
    getServices,
    deleteService,
    searchService,
    createService,
    updateService,
    getLatestServices
  };
}
