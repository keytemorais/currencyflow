

const amountInput = document.querySelector("#amount")
const currencyFrom = document.querySelector("#currency-from")
const currencyTo = document.querySelector("#currency-to")
const result = document.querySelector("#result")
const ratesStatus = document.querySelector("#rates-status")
const swapButton = document.querySelector(".swap-button")
const historyList = document.querySelector("#history-list")
const clearHistoryButton = document.querySelector("#clear-history")
const confirmModal = document.querySelector("#confirm-modal")
const cancelClearButton = document.querySelector("#cancel-clear")
const confirmClearButton = document.querySelector("#confirm-clear")
const quickRatesList = document.querySelector("#quick-rates-list")
const amountPrefix = document.querySelector("#amount-prefix")

let savedHistory = []

try {
    savedHistory = JSON.parse(localStorage.getItem("history")) || []
} catch (error) {
    console.log("Erro ao recuperar o histórico:", error)
}

if (!Array.isArray(savedHistory)) {
    savedHistory = []
}

// TAXAS DE CÂMBIO
let rates = {
    BRL: 1,
    USD: 5.2,
    EUR: 6.0,
    GBP: 7.0,
    BTC: 500000
}

const currencySymbols = {
    BRL: "R$",
    USD: "US$",
    EUR: "€",
    GBP: "£",
    BTC: "₿"
}

const quickRateInfo = [
    { code: "USD", name: "Dólar (USD)", flag: "🇺🇸" },
    { code: "EUR", name: "Euro (EUR)", flag: "🇪🇺" },
    { code: "GBP", name: "Libra (GBP)", flag: "🇬🇧" },
    { code: "BTC", name: "Bitcoin (BTC)", flag: "₿" }
]

// VALIDAR MOEDAS
function isValidCurrency(currency) {
    return Object.hasOwn(rates, currency)
}

// VALIDAR HISTÓRICO
function isValidConversion(conversion) {
    return (
        typeof conversion === "object" &&
        conversion !== null &&
        Number.isFinite(conversion.amount) &&
        conversion.amount > 0 &&
        Number.isFinite(conversion.convertedAmount) &&
        conversion.convertedAmount > 0 &&
        isValidCurrency(conversion.from) &&
        isValidCurrency(conversion.to) &&
        !Number.isNaN(Date.parse(conversion.date))
    )
}

const history = savedHistory
    .filter(isValidConversion)
    .map(conversion => ({
        ...conversion,
        date: new Date(conversion.date)
    }))

// FORMATAÇÃO DOS VALORES
function formatCurrency(value, currency) {

    if (currency === "BTC") {
        return `${new Intl.NumberFormat("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        }).format(value)} BTC`
    }

    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency
    }).format(value)
}

// FORMATAÇÃO DAS COTAÇÕES
function formatRateInBRL(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: value >= 1000 ? 2 : 4
    }).format(value)
}

// EXIBIR COTAÇÕES RÁPIDAS
function renderQuickRates() {

    quickRatesList.innerHTML = ""

    quickRateInfo.forEach(currency => {

        const row = document.createElement("div")
        row.classList.add("rate-row")

        const flag = document.createElement("span")
        flag.classList.add("rate-currency")
        flag.textContent = currency.flag

        const name = document.createElement("span")
        name.classList.add("rate-name")
        name.textContent = currency.name

        const value = document.createElement("strong")
        value.textContent = formatRateInBRL(rates[currency.code])

        row.append(flag, name, value)

        quickRatesList.append(row)

    })
}

// ATUALIZAR COTAÇÕES PELA API
async function updateRates() {

    ratesStatus.textContent = "Atualizando cotações..."
    ratesStatus.className = "rates-status loading"

    try {

        const response = await fetch(
            "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,BTC-BRL"
        )

        if (!response.ok) {
            throw new Error("Não foi possível obter as cotações.")
        }

        const data = await response.json()

        if (!data.USDBRL || !data.EURBRL || !data.GBPBRL || !data.BTCBRL) {
            throw new Error("Dados de cotação incompletos.")
        }

        const newRates = {
            BRL: 1,
            USD: Number(data.USDBRL.bid),
            EUR: Number(data.EURBRL.bid),
            GBP: Number(data.GBPBRL.bid),
            BTC: Number(data.BTCBRL.bid)
        }

        if (
            Object.values(newRates).some(
                rate => !Number.isFinite(rate) || rate <= 0
            )
        ) {
            throw new Error("Uma ou mais cotações são inválidas.")
        }

        rates = newRates

        ratesStatus.textContent = "Cotações atualizadas com sucesso!"
        ratesStatus.className = "rates-status success"

        renderQuickRates()
        convertValues()

    } catch (error) {

        console.log("Erro ao buscar cotações:", error)

        ratesStatus.textContent =
            "Não foi possível atualizar. Exibindo valores de referência."

        ratesStatus.className = "rates-status error"

        renderQuickRates()
    }
}

// CALCULAR CONVERSÃO
function calculateConversion(amount, from, to) {

    if (from === to) {
        return amount
    }

    const amountInBRL = amount * rates[from]

    return amountInBRL / rates[to]
}

// ATUALIZAR SÍMBOLO DA MOEDA
function updateAmountPrefix() {
    amountPrefix.textContent = currencySymbols[currencyFrom.value] || ""
}

// ADICIONAR AO HISTÓRICO
function addToHistory(amount, from, convertedAmount, to) {

    const conversion = {
        amount,
        from,
        convertedAmount,
        to,
        date: new Date()
    }

    history.push(conversion)

    if (history.length > 10) {
        history.shift()
    }

    try {
        localStorage.setItem("history", JSON.stringify(history))
    } catch (error) {
        console.log("Erro ao salvar o histórico:", error)
    }

    renderHistory()
}

// EXIBIR HISTÓRICO
function renderHistory() {

    historyList.innerHTML = ""

    if (history.length === 0) {

        const emptyMessage = document.createElement("p")

        emptyMessage.classList.add("empty-history")

        emptyMessage.textContent = "Nenhuma conversão realizada."

        historyList.append(emptyMessage)

        return
    }

    history.slice().reverse().forEach(conversion => {

        const historyItem = document.createElement("article")

        historyItem.classList.add("history-item")

        const conversionText = document.createElement("p")

        conversionText.textContent =
            `${formatCurrency(conversion.amount, conversion.from)} → ${formatCurrency(conversion.convertedAmount, conversion.to)}`

        const currencyText = document.createElement("small")

        currencyText.textContent =
            `${conversion.from} → ${conversion.to}`

        const dateText = document.createElement("p")

        dateText.classList.add("history-date")

        dateText.textContent = conversion.date.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })

        historyItem.append(conversionText, currencyText, dateText)

        historyList.append(historyItem)

    })
}

// CONVERSÃO PRINCIPAL
function convertValues() {

    const amount = Number(amountInput.value)
    const from = currencyFrom.value
    const to = currencyTo.value

    updateAmountPrefix()

    if (!isValidCurrency(from) || !isValidCurrency(to)) {
        result.textContent = "Moeda inválida"
        return
    }

    if (amountInput.value.trim() === "") {
        result.textContent = "--"
        return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        result.textContent = "Digite um valor válido"
        return
    }

    const convertedAmount = calculateConversion(amount, from, to)

    result.textContent = formatCurrency(convertedAmount, to)
}

// REGISTRAR CONVERSÃO
function registerCurrentConversion() {

    const amount = Number(amountInput.value)
    const from = currencyFrom.value
    const to = currencyTo.value

    if (
        amountInput.value.trim() === "" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !isValidCurrency(from) ||
        !isValidCurrency(to)
    ) {
        return
    }

    const convertedAmount = calculateConversion(amount, from, to)

    addToHistory(amount, from, convertedAmount, to)
}

// EVENTOS DO CONVERSOR
amountInput.addEventListener("input", convertValues)

amountInput.addEventListener("change", registerCurrentConversion)

currencyFrom.addEventListener("change", () => {
    convertValues()
    registerCurrentConversion()
})

currencyTo.addEventListener("change", () => {
    convertValues()
    registerCurrentConversion()
})

// INVERTER MOEDAS
swapButton.addEventListener("click", () => {

    const temporaryCurrency = currencyFrom.value

    currencyFrom.value = currencyTo.value
    currencyTo.value = temporaryCurrency

    convertValues()
    registerCurrentConversion()
})

// ABRIR MODAL
clearHistoryButton.addEventListener("click", () => {
    confirmModal.classList.add("active")
})

// CANCELAR EXCLUSÃO
cancelClearButton.addEventListener("click", () => {
    confirmModal.classList.remove("active")
})

// CONFIRMAR EXCLUSÃO
confirmClearButton.addEventListener("click", () => {

    history.length = 0

    localStorage.removeItem("history")

    renderHistory()

    confirmModal.classList.remove("active")
})

// FECHAR MODAL AO CLICAR FORA
confirmModal.addEventListener("click", event => {

    if (event.target === confirmModal) {
        confirmModal.classList.remove("active")
    }

})

// DESTACAR SEÇÃO ATIVA NO MENU
const navigationLinks = document.querySelectorAll(".menu a")

const pageSections = document.querySelectorAll(
    "#conversor, #historico, #sobre"
)

const sectionObserver = new IntersectionObserver(entries => {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            navigationLinks.forEach(link => {

                link.classList.toggle(
                    "active",
                    link.getAttribute("href") === `#${entry.target.id}`
                )

            })

        }

    })

}, {
    rootMargin: "-25% 0px -60% 0px"
})

pageSections.forEach(section => {
    sectionObserver.observe(section)
})

// INICIALIZAÇÃO
renderHistory()
updateAmountPrefix()
renderQuickRates()
updateRates()
