exports = async function hook(payload) {
  try {
    console.log("PAYLOAD ==>", stringify(payload));
    const atlas = context.services.get("mongodb-atlas");
    const eventsdb = atlas.db("stoner-cluster");
    const mongoService = initMongoService(eventsdb);
    const result = await handleAction(mongoService, payload.query);
    return result;
  } catch (error) {
    console.log("Owl Error", error);
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
    console.log("Response error", stringify(errorResponse));
    return errorResponse;
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
  console.log("Handling order action ...", action);
  if (action === "search") {
    result = await mongoService.searchOrder(data);
  }
  if (action === "latest") {
    result = await mongoService.getLatestOrders();
  }
  if (action === "finances") {
    result = await mongoService.updateOrderFinances(data);
  }
  if (action === "update") {
    //Usamos update para actualizar o crear un documento
    result = await mongoService.updateOrder(data);
  }
  if (action === "delete") {
    result = await mongoService.deleteOrder(data);
  }
  return result;
}

async function handleClientAction(mongoService, { action, data }) {
  let result = null;
  console.log("Handling client action ...", action);
  if (action === "update") {
    //Usamos update para actualizar o crear un documento
    result = await mongoService.updateClient(data);
  }
  if (action === "delete") {
    result = await mongoService.deleteClient(data);
  }
  return result;
}

function initMongoService(eventsdb) {
  // ============== Servicios para ordenes ==============
  function getLatestOrders() {
    const limit = 4;
    return getOrders({ limit });
  }

  async function searchOrder({ _id, proyecto, fechaCreacion }) {
    const query = {
      $or: [{ _id }, { proyecto }, { fechaCreacion }],
    };
    const limit = 1;
    const response = await getOrders({ limit, query });
    let result = {
      message:
        "No hemos encontrado una orden que coincida con tus criterios de búsqueda",
      ok: true,
      data: null,
    };
    if (response && response.data) {
      let [orderFound] = response.data;
      result.data = orderFound;
      result.message = `Hemos encontrado una orden: ${orderFound._id} - ${
        orderFound.proyecto || ""
      }`;
    }
    return result;
  }

  async function getOrders(options) {
    const lookup = {
      from: "client",
      localField: "clientId",
      foreignField: "_id",
      as: "client",
    };
    const aggregate = [
      {
        $unwind: { path: "$client", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "order",
          localField: "client._id",
          foreignField: "clientId",
          as: "clientOrders",
        },
      },
    ];
    const sort = { fechaCreacion: -1 };
    const data = await findDocuments({
      ...options,
      collection: "order",
      aggregate,
      lookup,
      sort,
    });
    return { ok: true, data, message: "Ordenes cargadas exitosamente" };
  }

  async function deleteOrder({ _id }) {
    const { deletedCount } = await deleteDocument({
      collection: "order",
      _id,
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

  async function updateOrderFinances(options) {
    let response = await updateDocument({
      ...options,
      upsert: false,
      collection: "order",
    });
    console.log("response", stringify(response));
    let result = {
      ok: false,
      data: null,
      message: "Hubo un problema actualizando la informacion financiera.",
    };
    const { modifiedCount } = response;
    if (modifiedCount) {
      result.ok = true;
      result.message = `Informacion financiera actualizada correctamente.`;
    }
    return result;
  }

  async function updateOrder(options) {
    let response = await updateDocument({
      ...options,
      idPrefix: "OC",
      collection: "order",
    });
    console.log("response", stringify(response));
    let result = {
      ok: false,
      data: null,
      message: "Hubo un problema actualizando la orden",
    };
    const { upsertedId, modifiedCount } = response;
    if (modifiedCount || upsertedId) {
      result.ok = true;
      result.data = { upsertedId };
      result.message = `Orden ${
        response.upsertedId ? "creada" : "actualizada"
      } correctamente`;
    }
    return result;
  }
  // ============== Fin Servicios Ordenes ==============

  // ============== Servicios para clientes ==============
  async function deleteClient({ _id }) {
    const { deletedCount } = await deleteDocument({
      collection: "client",
      _id,
    });
    let result = {
      message: "Parece que el cliente no existe",
      ok: false,
      data: null,
    };
    if (deletedCount) {
      result.ok = true;
      result.message = "Cliente borrado correctamente";
    }
    return result;
  }

  async function updateClient(options) {
    let response = await updateDocument({
      ...options,
      idPrefix: "CL",
      collection: "client",
    });
    console.log("response", stringify(response));
    let result = {
      ok: false,
      data: null,
      message: "Hubo un problema actualizando el cliente",
    };
    const { upsertedId, modifiedCount } = response;
    if (modifiedCount || upsertedId) {
      result.ok = true;
      result.data = { upsertedId };
      result.message = `Cliente ${
        response.upsertedId ? "creado" : "actualizado"
      } correctamente`;
    }
    return result;
  }

  // ============== Fin Servicios Cliente ==============

  // ============== CRUD generico para colecciones  ==============

  function findOneDocument({ collection, query = {} }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService.findOne(query);
  }

  function findDocuments({
    collection,
    query = {},
    sort = {},
    limit = 20,
    lookup = {},
    aggregate = [],
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
        ...aggregate,
        { $sort: sort },
        { $limit: limit },
      ])
      .toArray();
  }

  async function updateDocument({
    collection,
    _id,
    idPrefix,
    upsert = true,
    ...props
  }) {
    const collectionService = eventsdb.collection(collection);
    const sequenceName = `${collection}Id`;
    let id = _id || `${idPrefix}${await getNextSequenceValue(sequenceName)}`;
    return collectionService.updateOne(
      { _id: id },
      {
        $set: props,
        $setOnInsert: {
          fechaCreacion: new Date(),
        },
      },
      {
        upsert,
      }
    );
  }

  function deleteDocument({ collection, _id }) {
    const collectionService = eventsdb.collection(collection);
    return collectionService.deleteOne({ _id });
  }

  async function getNextSequenceValue(sequenceName) {
    let query = { _id: sequenceName };
    let updateResult = await eventsdb
      .collection("counter")
      .updateOne(query, { $inc: { sequenceValue: 1 } });
    if (updateResult.modifiedCount) {
      let result = await eventsdb.collection("counter").findOne(query);
      return result.sequenceValue;
    }
  }

  // ============== Fin CRUD generico ==============
  return {
    getOrders,
    deleteOrder,
    searchOrder,
    updateOrder,
    updateClient,
    deleteClient,
    getLatestOrders,
    updateOrderFinances,
  };
}
