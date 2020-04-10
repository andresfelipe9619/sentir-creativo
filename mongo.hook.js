exports = async function hook(payload) {
  try {
    console.log("PAYLOAD ==>", stringify(payload));
    const atlas = context.services.get("mongodb-atlas");
    const eventsdb = atlas.db("stoner-cluster");
    const mongoService = initMongoService(eventsdb);
    const result = await handleAction(mongoService, payload.query);
    return result;
  } catch (error) {
    console.log("error", error);
    let errorResponse = {
      ok: false,
      message: "",
    };
    if (typeof error === "object") {
      errorResponse.message = stringify(error);
    } else if (typeof error === "string") {
      errorResponse.message = error;
    } else {
      errorResponse.message =
        "Húbo un error en el servidor, por favor prueba más tarde";
    }
  }
};

function stringify(data) {
  return JSON.stringify(data, false, false);
}

async function handleAction(mongoService, { action, data, collection } = {}) {
  let result = { data: null, message: "Could not execute action" };
  console.log("ACTION ==>", action);
  console.log("DATA ==>", stringify(data));
  console.log("COLLECTION ==>", collection);
  let parsedData = data ? JSON.parse(data) : null;
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
  if (action === "search") {
    result = await mongoService.searchOrder(data);
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

  async function searchOrder({ ordenCompra, proyecto, fechaCreacion }) {
    const query = {
      $or: [{ ordenCompra }, { proyecto }, { fechaCreacion }],
    };
    const response = await findOneDocument({ query, collection: "services" });
    console.log("response", response);
    let result = {
      message:
        "No hemos encontrado una orden que coincida con tus criterios de búsqueda",
      ok: true,
      data: null,
    };
    if (response) {
      result.data = response;
      result.message = `Hemos encontrado una orden: \n ${stringify(response)}`;
    }
    return result;
  }

  function getOrders(options) {
    const lookup = {
      from: "client",
      localField: "clienteId",
      foreignField: "_id",
      as: "cliente",
    };
    const sort = { fechaCreacion: -1 };
    const data = findDocuments({
      ...options,
      collection: "services",
      lookup,
      sort,
    });
    return { ok: true, data, message: "Ordenes cargadas exitosamente" };
  }

  async function deleteOrder({ ordenCompra }) {
    const { deletedCount } = await deleteDocument({
      collection: "services",
      ordenCompra,
    });
    let result = {
      message: "Parece que la orden no existe",
      ok: false,
      data: null,
    };
    if (deletedCount) {
      result.ok = true;
      result.message = "Orden borrada correctamente";
    }
    return result;
  }

  function createOrder(options) {
    let result = {
      ok: false,
      data: null,
      message: "La orden no se pudo crear",
    };
    let resultId = createDocument({ ...options, collection: "services" });
    if (resultId) {
      result.ok = true;
      result.message = "Orden creada correctamente";
    }
    return result;
  }

  async function updateOrder(options) {
    let response = await updateDocument({
      ...options,
      collection: "services",
    });
    console.log("response", stringify(response));
    let result = {
      ok: false,
      data: null,
      message: "Hubo un problema actualizando la orden",
    };
    if (response.modifiedCount) {
      result.ok = true;
      result.message = "Orden actualizada correctamente";
    }
    return result;
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

  function findDocuments({
    collection,
    query = {},
    sort = {},
    limit = 20,
    lookup,
  }) {
    const collectionService = eventsdb.collection(collection);
    if (!lookup) {
      return collectionService.find(query).sort(sort).limit(limit).toArray();
    }
    return collectionService
      .aggregate([
        {
          $lookup: lookup,
        },
        { $sort: sort },
        { $limit: limit },
      ])
      .toArray();
  }

  function updateDocument({ collection, ordenCompra, ...props }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService.updateOne(
      { ordenCompra },
      { $set: props, $setOnInsert: { fechaCreacion: new Date() } },
      {
        upsert: true,
      }
    );
  }

  function deleteDocument({ collection, ordenCompra }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService.deleteOne({ ordenCompra });
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
