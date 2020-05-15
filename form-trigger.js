const ACTIVE_SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
const WEB_HOOK_URL =
  "https://us-east-1.aws.webhooks.mongodb-stitch.com/api/client/v2.0/app/sentircreativo-pfjno/service/google-sheet-connection/incoming_webhook/webhook0";
//Funcion subscrita a los eventos del spread sheet
function onEdit(e) {
  let range = e.range;
  checkEditedCell(range);
}
//Revisamos que la hoja que se edita es "Respuestas"
function checkEditedCell(range) {
  const sheetName = range.getSheet().getName();
  if (!sheetName.includes("Respuestas")) return;
  const row = +range.getRow();

  let [sheetValues] = ACTIVE_SPREADSHEET.getSheetValues(
    row,
    1,
    1,
    ACTIVE_SPREADSHEET.getLastColumn()
  );
  let [tempMark] = sheetValues;
  if (!tempMark) return;
  let tempDate = new Date(tempMark);
  if (!tempDate) return;
  if (!isToday(tempDate)) return;

  let { client, order } = getParsedData(sheetValues);
  console.log("{client, order}", { client, order });
  createOrderData({ client, order });
}

function getParsedData(sheetValues) {
  let [headers] = ACTIVE_SPREADSHEET.getSheetValues(
    1,
    1,
    1,
    ACTIVE_SPREADSHEET.getLastColumn()
  );
  const {
    client: clientValues,
    order: orderValues,
  } = mapSheetValues2MongoColumns({
    headers,
    sheetValues,
  });

  let [client] = sheetValuesToObject({
    headers: clientValues.headers,
    sheetValues: [clientValues.values],
  });
  let [order] = sheetValuesToObject({
    headers: orderValues.headers,
    sheetValues: [orderValues.values],
  });
  return { client, order };
}

function mapSheetValues2MongoColumns({ headers, sheetValues }) {
  const mongoColumns = headers.reduce(
    (acc, header, index) => {
      let colName = normalize(String(header)).toLowerCase();
      let colValue = String(sheetValues[index]).replace(/ *\[[^\]]*\] */g, "");
      if (colName.includes("estoy buscando")) {
        colName = "categoria";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("nombre")) {
        colName = "given name";
        acc.client.headers.push(colName);
        acc.client.values.push(colValue);
      }
      if (colName.includes("apellidos")) {
        colName = "family name";
        acc.client.headers.push(colName);
        acc.client.values.push(colValue);
      }
      if (colName.includes("email")) {
        colName = "email";
        acc.client.headers.push(colName);
        acc.client.values.push(colValue);
      }
      if (colName.includes("institucion")) {
        colName = "organization name";
        acc.client.headers.push(colName);
        acc.client.values.push(colValue);
      }
      if (colName.includes("celular")) {
        colName = "phone number";
        acc.client.headers.push(colName);
        acc.client.values.push(colValue);
      }
      if (colName.includes("sector")) {
        colName = "group memberShip info";
        acc.client.headers.push(colName);
        acc.client.values.push(colValue);
      }
      if (colName.includes("beneficiado")) {
        colName = "beneficiados";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("cantidad de personas")) {
        colName = "max beneficiados";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("direccion")) {
        colName = "location";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("fecha estimada")) {
        colName = "hora inicio";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("hora de termino")) {
        colName = "hora termino";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("financiado")) {
        colName = "financiado por";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("tamaño del proyecto")) {
        colName = "tamaño proyecto";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("algun comentario")) {
        colName = "comentarios";
        acc.order.headers.push(colName);
        acc.order.values.push(colValue);
      }
      if (colName.includes("como se entero")) {
        colName = "notes";
        acc.client.headers.push(colName);
        acc.client.values.push(colValue);
      }
      return acc;
    },
    { client: { values: [], headers: [] }, order: { values: [], headers: [] } }
  );
  console.log("mongoColumns", mongoColumns);
  return mongoColumns;
}
// Falta cuadrar bien el actualizar un cliente por correo y
// devolver el id del cliente para guaradar la orden.
async function createOrderData({ order, client }) {
  if (client && order) {
    let cResponse = await API.updateOrCreateClient(client);
    console.log("cResponse", cResponse);
    if (!cResponse.ok) return showResponseMessage(cResponse);
    if ((cResponse.data || {}).upsertedId) {
      order.clientId = cResponse.data.upsertedId;
    }
    let oResponse = await API.updateOrCreateOrder(order);
    return showResponseMessage(oResponse);
  }
}
