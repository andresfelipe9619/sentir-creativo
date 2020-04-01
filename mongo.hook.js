exports = async function hook(payload) {
  console.log("PAYLOAD ==>", stringify(payload));
  const atlas = context.services.get("mongodb-atlas");
  const eventsdb = atlas.db("stoner-cluster");
  const mongoService = initMongoService(eventsdb);
  const { action, data } = payload.query || {};
  const result = await handleAction(mongoService, { action, data });
  return result;
};

function stringify(data) {
  return JSON.stringify(data, false, false);
}

async function handleAction(mongoService, { action, data }) {
  let result = { data: null, message: "Could not execute action" };
  console.log("ACTION ==>", action);
  console.log("DATA ==>", stringify(data));
  if (action === "read") {
    result = await mongoService.getOrders();
  }
  if (action === "search") {
    result = await mongoService.searchOrder();
  }
  if (action === "latest") {
    result = await mongoService.getLatestOrders();
  }
  if (action === "create") {
    result = await mongoService.createOrder();
  }
  if (action === "update") {
    result = await mongoService.updateOrder();
  }
  if (action === "delete") {
    result = await mongoService.deleteOrder(data);
  }
  console.log("RESULT ==>", stringify(result));
  return result;
}

function initMongoService(eventsdb) {
  // ============== Servicios para la coleccion de servicios ==============
  function getLatestOrders() {
    const limit = 4;
    return getOrders({ limit });
  }

  function searchOrder(query) {
    return findOneDocument(query);
  }

  function getOrders(options) {
    return findDocuments({ collection: "services", ...options });
  }

  function deleteOrder({ id }) {
    const { deletedCount } = deleteDocument({ collection: "services", id });
    let result = { message: "Service deleted correctly", data: null };
    if (!deletedCount) result.message = "Looks like the service does not exist";
    return result;
  }

  function createOrder(options) {
    return createDocument({ collection: "services", ...options });
  }

  function updateOrder(options) {
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
      .aggregate([
        {
          $lookup: {
            from: "client",
            localField: "clienteId",
            foreignField: "_id",
            as: "cliente"
          }
        },
        { $limit: limit || 20 }
      ])
      .toArray();
  }

  function updateDocument({ collection, props }) {}

  function deleteDocument({ collection, id }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService.deleteOne({ _id: { $oid: id } });
  }

  // ============== Fin CRUD generico ==============
  return {
    getOrders,
    deleteOrder,
    searchOrder,
    createOrder,
    updateOrder,
    getLatestOrders
  };
}
