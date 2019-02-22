const API_KEY = 'keyhlCvW8cKeIALjf'
const INCOMING_ITEMS = 'https://api.airtable.com/v0/appK5r1OQWwkZ1t6L/Incoming%20Items'
const INVENTORY = 'https://api.airtable.com/v0/appK5r1OQWwkZ1t6L/Inventory'
const FOOD_FACTS = 'https://sg.openfoodfacts.org/api/v0/product/'

function log (text) {
  $('#status').text(text)
}

function toggleProductFields (disabled) {
  $('#product-details input[type=text]').prop('readonly', disabled)
  $('#product-details input[type=checkbox]').prop('disabled', disabled)
  $('#product-details select').prop('disabled', disabled)
}

async function registerNewProduct () {
  const record = { fields: {} }
  $('form').serializeArray()
    .filter(v => ['Description', 'Size', 'Category'].includes(v.name))
    .forEach(v => record.fields[v.name] = v.value)
  record.fields['Halal?'] = $('input[name=Halal\\?]').prop('checked')
  record.fields.UOM = $('select[name=UOM]').val()
  record.fields.Barcode = { text: $('input[name=Barcode]').val() }

  const post = $.post({
    url: `${INVENTORY}?api_key=${API_KEY}`,
    data: JSON.stringify(record),
    success: data => {
      log('Registered new product!')
      console.log('Registered new product:', data)
      $('input[name=Product]').val(data.id)
      toggleProductFields(true)
    },
    dataType: 'json',
    contentType: 'application/json',
  })

  return post.promise()
}

function addIncomingItem () {
  const record = { fields: {} }
  $('form').serializeArray()
    .filter(v => ['Product', 'Quantity'].includes(v.name))
    .forEach(v => record.fields[v.name] = v.value)
  record.fields.Product = [record.fields.Product]
  record.fields.Quantity = Number(record.fields.Quantity)
  $.post({
    url: `${INCOMING_ITEMS}?api_key=${API_KEY}`,
    data: JSON.stringify(record),
    success: data => {
      log('Item added!')
      console.log('Added to incoming items:', data)
      $('input[name=Product]').val(undefined)
      $('form').trigger('reset')
    },
    dataType: 'json',
    contentType: 'application/json',
  })
}

function lookupFoodFacts (barcode, callback) {
  $.get({
    url: FOOD_FACTS + barcode,
    success: data => {
      const { product } = data
      if (product) {
        $('input[name=Description]').val(product.product_name)
        const sizeDetails = /(\d+)(.*)/.exec(product.serving_size)
        if (sizeDetails) {
          const [, size, uom] = sizeDetails
          $('input[name=Size]').val(size)
          $('select[name=UOM]').val(uom)
        }
      }
      callback()
    },
    dataType: 'json',
  })
}

function go () {
  $('#scan').click(async () => {
    const codeReader = new ZXing.BrowserBarcodeReader()

    codeReader
      .decodeFromInputVideoDevice(undefined, 'video')
      .then(result => {
        $('input[name=Barcode]').val(result.text)
        $('#lookup').trigger('click')
        codeReader.reset()
      })
      .catch(err => console.error(err))
  })

  $('#enterBarcode').click(async () => {
    $('input[name=Barcode]').val($('input[name=BarcodeInput]').val())
    $('#lookup').trigger('click')
  })


  $('#lookup').click(() => {
    $('input[name=Product]').val(undefined)
    $('#product-details input').val(undefined)
    $('select[name=UOM]').val('')
    $('input[name=Halal\\?]').prop('checked', false)

    const barcode = $('input[name=Barcode]').val()
    $.get({
      url: `${INVENTORY}?api_key=${API_KEY}&filterByFormula=${encodeURIComponent('{ID}='+barcode)}`,
      success: data => {
        const [record] = data.records
        if (record) {
          $('input[name=Product]').val(record.id)
          ;['Description', 'Size', 'Category'].forEach(field => {
            $(`input[name=${field}]`).val(record.fields[field])
          })
          $('select[name=UOM]').val(record.fields.UOM)
          $('input[name=Halal\\?]').prop('checked', record.fields['Halal?'])
        } else {
          log('This is a new product =(')
          lookupFoodFacts(barcode, () => toggleProductFields(false))
        }
      },
      dataType: 'json',
      contentType: 'application/json',
    })
    $('#launchForm').trigger('click');
  })


  $('form').on('submit', async e => {
    e.preventDefault()
    if ($('input[name=Product]').val() === '') {
      await registerNewProduct()
    }
    addIncomingItem()
  })
}

$(document).ready(go)
