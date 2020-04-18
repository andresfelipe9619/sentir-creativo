function useOrder(rowValues) {
  var hasValues = rowValues.length > 1;
  if (hasValues) {
    let response = API.getLatestOrders();
    if (response.ok) {
      const order = response.data.find((o) => o._id === rowValues[1]);
      return fillOrderData(order);
    }
    return showResponseMessage(response);
  }
  return showErrorMessage(
    "Por favor selecciona un rango de las ultimas ordenes de compra no vacio para poder usarla."
  );
}

function fillOrderData(order) {
  console.log("order", order);
  if (!order) return showErrorMessage("No se pudo cargar orden");
  showMessage("Campo seleccionado", order._id);
  const { headers, range } = getOrderRange();
  let orderValues = jsonToSheetValues({
    data: order,
    headers,
    direction: "vertical",
  });
  range.setValues(orderValues);
  // const [cliente] = order.cliente || [];
  // if (cliente) fillClientData(cliente);
}

function getOrderRange() {
  const headers = ACTIVE_SPREADSHEET.getRange("B53:B64")
    .getValues()
    .flatMap((v) => v);
  const range = ACTIVE_SPREADSHEET.getRange("C53:C64");
  return { headers, range };
}

function getFinanceRange() {
  const headers = ACTIVE_SPREADSHEET.getRange("B70:B81")
    .getValues()
    .flatMap((v) => v);
  const range = ACTIVE_SPREADSHEET.getRange("C70:C81");
  return { headers, range };
}

function fillLatestOrders(orders) {
  const [headers] = ACTIVE_SPREADSHEET.getRange("B7:D7").getValues();
  const values = jsonToSheetValues({ data: orders, headers });
  console.log("values", values);
  const tableRange = ACTIVE_SPREADSHEET.getRange("B8:D11");
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
  var searchRange = ACTIVE_SPREADSHEET.getRange("B16:D16");
  var searchValues = searchRange.getValues()[0];
  var hasValues = !!searchValues.filter(notNull).length;
  if (hasValues) {
    const response = API.searchOrder({
      _id: searchValues[0],
      proyecto: searchValues[1],
      fechaCreacion: searchValues[2],
    });
    return showResponseMessage(response);
  }
  return showErrorMessage("Por favor escribe algo para buscar");
}

function deleteOrder() {
  const { headers, range } = getOrderRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  const [order] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  console.log("order", order);
  const response = API.deleteOrder({ _id: order._id });
  showResponseMessage(response);
  if (response.ok) {
    const emptyRange = range.getValues().map(() => [""]);
    console.log("emptyRange", emptyRange);
    range.setValues(emptyRange);
  }
}

function updateOrCreateOrder() {
  const { headers, range } = getOrderRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  const [order] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  console.log("order", order);
  const response = API.updateOrCreateOrder(order);
  showResponseMessage(response);
  if ((response.data || {}).upsertedId) {
    ACTIVE_SPREADSHEET.getRange("C53").setValue(response.data.upsertedId);
  }
}

function updateOrderFinances() {
  const orderId = ACTIVE_SPREADSHEET.getRange("C53").getValue();
  const { headers, range } = getFinanceRange();
  const sheetValues = range.getValues().flatMap((v) => v);
  const [order] = sheetValuesToObject({
    headers,
    sheetValues: [sheetValues],
  });
  const response = API.updateOrCreateOrder({ _id: orderId, ...order });
  showResponseMessage(response);
}
