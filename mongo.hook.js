exports = async function hook(payload) {
  console.log("PAYLOAD ==>", stringify(payload));
  const atlas = context.services.get("mongodb-atlas");
  const eventsdb = atlas.db("stoner-cluster");
  const mongoService = initMongoService(eventsdb);
  const result = await handleAction(mongoService, payload.query);
  return result;
};

function stringify(data) {
  return JSON.stringify(data, false, false);
}

async function handleAction(mongoService, { action, data, collection } = {}) {
  let result = { data: null, message: "Could not execute action" };
  console.log("ACTION ==>", action);
  console.log("DATA ==>", stringify(data));
  console.log("COLLECTION ==>", collection);
  let parsedData = JSON.parse(data);
  if (collection === "order") {
    result = await handleOrderAction(mongoService, {
      action,
      data: parsedData,
    });
  }
  if (collection === "client") {
    result = await handleClientAction(mongoService, {
      action,
      data: parsedData,
    });
  }
  console.log("RESULT ==>", stringify(result));
  return result;
}

async function handleOrderAction(mongoService, { action, data }) {
  let result = null;
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
    result = await mongoService.updateOrder(data);
  }
  if (action === "delete") {
    result = await mongoService.deleteOrder(data);
  }
  return result;
}

async function handleClientAction(action, data) {
  let result = null;

  if (action === "read") {
    result = await mongoService.getOrders();
  }
  if (action === "search") {
    result = await mongoService.searchOrder(data);
  }
  if (action === "latest") {
    result = await mongoService.getLatestOrders();
  }
  if (action === "create") {
    result = await mongoService.createOrder(data);
  }
  if (action === "update") {
    result = await mongoService.updateOrder(data);
  }
  if (action === "delete") {
    result = await mongoService.deleteOrder(data);
  }
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
    return findDocuments({ ...options, collection: "services" });
  }

  function deleteOrder({ id }) {
    const { deletedCount } = deleteDocument({ collection: "services", id });
    let result = { message: "Service deleted correctly", data: null };
    if (!deletedCount) result.message = "Looks like the service does not exist";
    return result;
  }

  function createOrder(options) {
    return createDocument({ ...options, collection: "services" });
  }

  function updateOrder(options) {
    return updateDocument({ ...options, collection: "services" });
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
            as: "cliente",
          },
        },
        { $limit: limit || 20 },
      ])
      .toArray();
  }

  function updateDocument({ collection, ordenCompra, ...props }) {
    console.log(
      "{collection, ordenCompra}",
      stringify({ collection, ordenCompra })
    );
    const collectionService = eventsdb.collection(collection);
    return collectionService.updateOne({ ordenCompra }, props, {
      upsert: true,
    });
  }

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
    getLatestOrders,
  };
}
