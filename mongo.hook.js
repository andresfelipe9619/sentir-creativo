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

function isDate(s) {
  if (isNaN(s) && !isNaN(Date.parse(s))) {
    return true;
  }
  return false;
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
  // eventsdb.collection("client").createIndex({ email: 1 }, { unique: true });

  // ============== Servicios para ordenes ==============
  function getLatestOrders() {
    const limit = 4;
    return getOrders({ limit });
  }

  async function searchOrder({ _id, proyecto, fechaCreacion }) {
    console.log(
      "{_id, proyecto, fechaCreacion}",
      stringify({
        _id,
        proyecto,
        fechaCreacion,
      })
    );
    let or = [];
    let sort = null;
    if (_id) or.push({ _id });
    if (proyecto) or.push({ proyecto: { $regex: proyecto, $options: "i" } });
    if (fechaCreacion) {
      let creationDate = new Date(fechaCreacion);
      let day = creationDate.getDate();
      let month = creationDate.getMonth();
      let year = creationDate.getFullYear();
      let startDate = new Date(year, month, day);
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date(year, month, day);
      endDate.setHours(23, 59, 59, 999);
      // sort = { fechaCreacion: 1 };
      or.push({ fechaCreacion: { $gte: startDate, $lt: endDate } });
    }
    console.log("or", stringify(or));
    const query =
      or.length > 1
        ? {
            $or: or,
          }
        : or[0];
    const limit = 1;
    const response = await getOrders({ limit, query, sort });
    let result = {
      message:
        "No hemos encontrado una orden que coincida con tus criterios de búsqueda",
      ok: false,
      data: null,
    };
    if (response && response.data) {
      console.log("SEARCH Response", stringify(response));
      let [orderFound] = response.data;
      result.data = orderFound;
      if (orderFound) {
        result.ok = true;
        result.message = `Hemos encontrado una orden: ${orderFound._id} - ${
          orderFound.proyecto || ""
        }`;
      }
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
    const sort = options.sort ? options.sort : { fechaCreacion: -1 };
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
      message: "Hubo un problema actualizando la información financiera.",
    };
    const { modifiedCount, matchedCount } = response;
    if (modifiedCount || matchedCount) {
      result.ok = true;
      result.message = `información financiera actualizada correctamente.`;
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
      result.data = upsertedId ? { upsertedId } : null;
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
    let foundClient = null;
    if (!options._id && options.email) {
      foundClient = await findOneDocument({
        query: { email: options.email },
        collection: "client",
      });
    }
    console.log("foundClient", stringify(foundClient));
    let response = await updateDocument({
      ...options,
      _id: foundClient ? foundClient._id : options._id,
      idPrefix: "CL",
      collection: "client",
    });
    console.log("response", stringify(response));
    let result = {
      ok: false,
      data: null,
      message: "Hubo un problema actualizando el cliente",
    };
    const { upsertedId, modifiedCount, matchedCount } = response;
    if (modifiedCount || upsertedId || (foundClient && matchedCount)) {
      result.ok = true;
      result.data = upsertedId
        ? { upsertedId }
        : foundClient
        ? { upsertedId: foundClient._id }
        : null;
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
          $match: query,
        },
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
    let propsToSet = Object.keys(props).reduce((acc, prop) => {
      let keyValue = props[prop];
      let value2set = isDate(keyValue) ? new Date(keyValue) : keyValue;
      acc[prop] = value2set;
      return acc;
    }, {});
    let query = {};
    if (id) query._id = id;
    return collectionService.updateOne(
      query,
      {
        $set: propsToSet,
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
