const API = {
  searchOrder(data) {
    return fetchWebHook({ collection: "order", action: "search", data });
  },
  getLatestOrders() {
    return fetchWebHook({ collection: "order", action: "latest" });
  },
  createOrder(data) {
    return fetchWebHook({ collection: "order", action: "create", data });
  },
  updateOrCreateOrder(data) {
    return fetchWebHook({ collection: "order", action: "update", data });
  },
  deleteOrder(data) {
    return fetchWebHook({ collection: "order", action: "delete", data });
  },
  createClient(data) {
    return fetchWebHook({ collection: "client", action: "create", data });
  },
  updateOrCreateClient(data) {
    return fetchWebHook({ collection: "client", action: "update", data });
  },
  deleteClient(data) {
    return fetchWebHook({ collection: "client", action: "delete", data });
  },
};

function fetchWebHook({ data, action, collection }) {
  console.log("FETCH ARGS", { data, action, collection });
  var params = {
    method: "GET",
    followRedirects: true,
    muteHttpExceptions: true,
  };
  const query = {
    action,
    collection,
    data: data ? JSON.stringify(data) : null,
  };
  const url2Fetch = addQuery({ url: WEB_HOOK_URL, query });
  const response = UrlFetchApp.fetch(url2Fetch, params);
  console.log("response", JSON.stringify(response));
  if (response.getResponseCode() == 200) {
    const result = JSON.parse(response.getContentText());
    console.log("result", result);
    return result;
  }
}

//Funcion que que recibe laa respusta de "Stitch"
// y basado en ella muestra una alerta de exito o error.
function showResponseMessage(response) {
  if (!response) return;
  console.log("response", stringify(response));
  if (response.ok) showMessage("Exito", response.message);
  else showErrorMessage(response.message);
}

function addQuery({ url, query }) {
  return (
    url +
    Object.keys(query).reduce(
      (p, e, i) =>
        p +
        (i == 0 ? "?" : "&") +
        (Array.isArray(query[e])
          ? query[e].reduce(
              (str, f, j) =>
                str +
                e +
                "=" +
                encodeURIComponent(f) +
                (j != query[e].length - 1 ? "&" : ""),
              ""
            )
          : e + "=" + encodeURIComponent(query[e])),
      ""
    )
  );
}
