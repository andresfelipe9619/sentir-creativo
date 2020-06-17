function useOrder(rowValues) {
  console.log("rowValues", rowValues);
  var hasValues = rowValues.length > 1;
  if (hasValues) {
    let response = API.searchOrder({
      _id: rowValues[1],
      proyecto: rowValues[2],
      fechaCreacion: rowValues[3],
    });
    if (response.ok) {
      const order = response.data;
      return fillOrderData(order);
    }
    return showResponseMessage(response);
  }
  return showErrorMessage(
    "Por favor selecciona un rango de las ultimas ordenes de compra no vacio para poder usarla."
  );
}

function fillOrderData(order) {
  console.log("Filling order data", order);
  if (!order) return showErrorMessage("No se pudo cargar orden");
  showMessage("Campo seleccionado", order._id);
  const { headers, range } = getOrderRange();
  let orderValues = jsonToSheetValues({
    data: order,
    headers,
    direction: "vertical",
  });
  range.setValues(orderValues);
  const { headers: financeHeaders, range: financeRange } = getFinanceRange();
  let financeValues = jsonToSheetValues({
    data: order,
    headers: financeHeaders,
    direction: "vertical",
  });
  financeRange.setValues(financeValues);
  const { client } = order;
  if (client) fillClientData(client, order.clientOrders);
}

function getOrderRange() {
  const headers = ACTIVE_SPREADSHEET.getRange("B53:B64")
    .getValues()
    .flatMap((v) => v);
  const range = ACTIVE_SPREADSHEET.getRange("C53:C64");
  return { headers, range };
}

function getFinanceRange() {
  const headers = ACTIVE_SPREADSHEET.getRange("B74:B85")
    .getValues()
    .flatMap((v) => v);
  const range = ACTIVE_SPREADSHEET.getRange("C74:C85");
  const assignRange = ACTIVE_SPREADSHEET.getRange("H74:H85");
  return { headers, range, assignRange };
}

function getOrderIdRange() {
  return ACTIVE_SPREADSHEET.getRange("C55");
}

function getCurrentOrder() {
  const { headers, range } = getOrderRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  const [order] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  console.log("order", order);
  return { order, range };
}

function getCurrentOrderFinances() {
  const { headers, range, assignRange } = getFinanceRange();
  const sheetValues = assignRange.getValues();
  const flatedValues = sheetValues.flatMap((v) => v);
  const [order] = sheetValuesToObject({
    headers,
    sheetValues: [flatedValues],
  });
  return { order, range, sheetValues };
}

function cleanOrderData() {
  const { range } = getCurrentOrder();
  const { range: financeRange } = getFinanceRange();
  const emptyRange = range.getValues().map(sheetValue2Empty());
  const emptyFianceRange = financeRange.getValues().map(sheetValue2Empty());
  range.setValues(emptyRange);
  financeRange.setValues(emptyFianceRange);
}

const sheetValue2Empty = (cols = 1) => () => new Array(cols).map(() => "");

function fillLatestOrders(orders) {
  console.log("Filling Latest Orders ...");
  const [headers] = ACTIVE_SPREADSHEET.getRange("B7:D7").getValues();
  const values = jsonToSheetValues({ data: orders, headers });
  const tableRange = ACTIVE_SPREADSHEET.getRange("B8:D11");
  const emptyRange = tableRange.getValues().map(sheetValue2Empty(3));
  tableRange.setValues(emptyRange);

  const ordersValues = tableRange
    .getValues()
    //Completa con filas vacias si el numero de ordenes es menor al rango en la hoja
    .map((row, i) => ((values[i] || []).length ? values[i] : row));
  tableRange.setValues(ordersValues);
}

function getLastestOrders() {
  const response = API.getLatestOrders();
  showResponseMessage(response);
  if (response.ok) fillLatestOrders(response.data);
}

function searchOrder() {
  const searchRange = ACTIVE_SPREADSHEET.getRange("B17:D17");
  const searchValues = searchRange.getValues()[0];
  const hasValues = !!searchValues.filter(notNull).length;
  if (!hasValues) return showErrorMessage("Por favor escribe algo para buscar");

  const response = API.searchOrder({
    _id: searchValues[0],
    proyecto: searchValues[1],
    fechaCreacion: searchValues[2],
  });
  return showResponseMessage(response);
}

function deleteOrder() {
  const { order } = getCurrentOrder();
  const response = API.deleteOrder({ _id: order._id });
  showResponseMessage(response);
  if (response.ok) cleanOrderData();
}

function updateOrCreateOrder() {
  const { order } = getCurrentOrder();
  const response = API.updateOrCreateOrder(order);
  showResponseMessage(response);
  if ((response.data || {}).upsertedId) {
    getOrderIdRange().setValue(response.data.upsertedId);
  }
}

function updateOrderFinances() {
  const orderId = getOrderIdRange().getValue();
  const { order, range, sheetValues } = getCurrentOrderFinances();
  const response = API.updateOrderFinances({ _id: orderId, ...order });
  showResponseMessage(response);
  if (response.ok) range.setValues(sheetValues);
}
