const q = t => document.querySelector(t);
const r = t => t.raw ? t.raw[0] : t;

const pressToStart = q(".press-to-start");
const questionContainer = q(".question-container");
const questionLabel = q(".question");
const questionOptions = q(".options");
const timeBar = q(".time-value");
const pointsText = q(".points");
const highScoreText = q(".high-score");
const pointDifference = q(".point-difference");
const endButton = q(".end-button");
let optionNames;
let correctOption;
const timeouts = [];
let over = false;
let points = 0;
const lang = localStorage.getItem("calc#lang") || (navigator.language.includes("tr") ? "tr" : "en");
document.title = lang === "tr" ? "Kalkülüs Hızlı Test" : "Quick Calculus Test";
pressToStart.textContent = lang === "tr" ? "Başlamak için tıkla" : "Click to start";
endButton.textContent = lang === "tr" ? "Bitir" : "End";
localStorage.setItem("calc#lang", lang);
updateHighScore();

const trigIdentities = {
    "sin^2(x) + cos^2(x)": "1",
    "1 - sin^2(x)": "cos^2(x)",
    "1 - cos^2(x)": "sin^2(x)",
    "sec^2(x) - 1": "tan^2(x)",
    "tan^2(x) + 1": "sec^2(x)",
    "2cos^2(x) - 1": "cos(2x)",
    "1 - 2sin^2(x)": "cos(2x)",
    "2sin(x)cos(x)": "sin(2x)",
    "sin(x)cos(x)": r`\frac{1}{2}sin(2x)`,
    "sin^2(x)": r`\frac{1}{2} (1 - cos(2x))`,
    "cos^2(x)": r`\frac{1}{2} (1 + cos(2x))`,
};

const trickeryTrigIdentities = {
    "sin^2(x) + cos^2(x)": ["sin(x)cos(x)"],
    "1 - sin^2(x)": ["cos(2x)"],
    "1 - cos^2(x)": ["cos(2x)"],
    "sec^2(x) - 1": ["tan(x)"],
    "tan^2(x) + 1": ["sec(x)"],
    "2cos^2(x) - 1": ["sin(2x)"],
    "1 - 2sin^2(x)": ["sin(2x)"],
    "2sin(x)cos(x)": ["cos(2x)"],
    "sin(x)cos(x)": ["2sin(2x)"],
    "sin^2(x)": [r`\frac{1}{2} (1 + cos(2x))`],
    "cos^2(x)": [r`\frac{1}{2} (1 - cos(2x))`],
};

const derivatives = {
    "e^x": "e^x",
    "ln(x)": r`\frac{1}{x}`,
    "sin(x)": r`cos(x)`,
    "cos(x)": r`-sin(x)`,
    "tan(x)": r`sec^2(x)`,
    "cot(x)": r`-csc^2(x)`,
    "csc(x)": r`-csc(x) cot(x)`,
    "sec(x)": r`sec(x) tan(x)`,
    "arcsin(x)": r`\frac{1}{\sqrt{1 - x^2}}`,
    "arccos(x)": r`-\frac{1}{\sqrt{1 - x^2}}`,
    "arctan(x)": r`\frac{1}{1 + x^2}`,
    "arccsc(x)": r`-\frac{1}{|x|\sqrt{x^2 - 1}}`,
    "arcsec(x)": r`\frac{1}{|x|\sqrt{x^2 - 1}}`,
    "arccot(x)": r`-\frac{1}{1 + x^2}`
};

const trickeryDerivatives = {
    "sin(x)": ["-cos(x)"],
    "cos(x)": ["sin(x)"],
    "tan(x)": ["sec(x)"],
    "cot(x)": ["csc^2(x)", "csc(x)"],
    "csc(x)": ["csc(x) cot(x)", "csc(x) tan(x)", "-csc(x) tan(x)"],
    "sec(x)": ["-sec(x) tan(x)", "sec(x) cot(x)", "-sec(x) cot(x)"],
    "arcsin(x)": [r`-\frac{1}{\sqrt{1 - x^2}}`, r`-\frac{1}{\sqrt{x^2 - 1}}`],
    "arccos(x)": [r`\frac{1}{\sqrt{1 - x^2}}`, r`-\frac{1}{\sqrt{x^2 - 1}}`],
    "arctan(x)": [r`-\frac{1}{1 + x^2}`, r`\frac{1}{1 - x^2}`],
    "arccsc(x)": [r`\frac{1}{|x|\sqrt{x^2 - 1}}`, r`-\frac{1}{|x|\sqrt{1 - x^2}}`],
    "arcsec(x)": [r`-\frac{1}{|x|\sqrt{x^2 - 1}}`, r`-\frac{1}{|x|\sqrt{1 - x^2}}`],
    "arccot(x)": [r`\frac{1}{1 + x^2}`, r`-\frac{1}{1 - x^2}`]
};

const integrals = {
    "sec(x)": "ln|sec(x) + tan(x)|",
    "csc(x)": "-ln|csc(x) + cot(x)|",
    "cot(x)": "ln|sin(x)|",
    "tan(x)": "-ln|cos(x)|",
    [r`\frac{1}{x}`]: "ln|x|"
};

const trickeryIntegrals = {
    "sec(x)": ["ln|sec(x) + cot(x)|", "-ln|sec(x) + tan(x)|"],
    "csc(x)": ["ln|csc(x) + cot(x)|", "-ln|csc(x) + tan(x)|"],
    "cot(x)": ["ln|cos(x)|", "-ln|sin(x)|"],
    "tan(x)": ["-ln|sin(x)|", "ln|cos(x)|"]
};

function setSafeTimeout(cb, t) {
    timeouts.push(setTimeout(cb, t));
}

function clearTimeouts() {
    for (const timeout of timeouts) {
        clearTimeout(timeout);
    }

    timeouts.length = 0;
}

function getUnsortedOptions(answer, question, trick, max = 6) {
    return [...new Set([
        ...(trick ? [trick] : []),
        answer,
        ...shuffle(allOptions).filter((option) => option !== answer && option !== question).slice(0, max - 1 - !!trick)
    ])];
}

function getRandomOptions(answer, question, trick, max = 6) {
    return shuffle(getUnsortedOptions(answer, question, trick, max));
}

const topics = {
    trig() {
        const question = randArray(Object.keys(trigIdentities));
        const answer = trigIdentities[question];
        const trick = randArray(trickeryTrigIdentities[question] || []);
        const options = getRandomOptions(answer, question, trick);

        return {question: question + r` =\text{ ?}`, answer, options};
    },
    derivatives() {
        const question = randArray(Object.keys(derivatives));
        const answer = derivatives[question];
        const trick = randArray(trickeryDerivatives[question] || []);
        const options = getRandomOptions(answer, question, trick);

        return {
            question: r`\frac{d}{dx}\text{ }` + question + r` =\text{ ?}`,
            answer,
            options
        };
    },
    integrals() {
        const question = randArray(Object.keys(integrals));
        const answer = integrals[question];
        const trick = randArray(trickeryIntegrals[question] || []);
        const options = getRandomOptions(answer, question, trick);

        return {
            question: r`\int ` + question + r` dx =\text{ ?}`,
            answer: answer + " + C",
            options: options.map(o => o + " + C")
        };
    }
};

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randArray(array) {
    return array[randInt(0, array.length - 1)];
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

const allOptions = [...new Set([
    ...[trigIdentities, derivatives, integrals].map(i => Object.entries(i)).flat(2)
])];

function generateQuestion() {
    const topic = randArray(Object.keys(topics));
    return topics[topic]();
}

function showQuestionInABit(question) {
    questionContainer.style.scale = "0";
    timeBar.hidden = true;
    setSafeTimeout(() => showQuestion(question), 500);
}

function newQuestion() {
    showQuestionInABit(generateQuestion());
}

function updateHighScore() {
    let highScore = parseInt(localStorage.getItem("calc#highScore") || 0);

    if (points > highScore) {
        highScore = points;
        localStorage.setItem("calc#highScore", highScore);
    }

    if (highScore) highScoreText.textContent = (lang === "en" ? "High score: " : "Rekor puan: ") + highScore;
}

function addPoints(p) {
    p = Math.round(p);
    points += p;
    pointsText.textContent = points;
    if (p === 0) return;

    updateHighScore();

    pointDifference.textContent = p > 0 ? "+" + p : p;
    pointDifference.classList.remove("green");
    pointDifference.classList.remove("red");

    if (p > 0) pointDifference.classList.add("green");
    else pointDifference.classList.add("red");

    pointDifference.style.animation = "point-difference 1s forwards";

    setSafeTimeout(() => pointDifference.style.animation = "", 1000);
}

function renderLatex(text, element) {
    // noinspection JSUnresolvedReference
    katex.render(text + "", element, {throwOnError: false});
}

function isMobileViewport() {
    return innerWidth <= 768;
}

function makeOptionDiv(option, index, answer, time) {
    const startTime = Date.now();
    const optionElement = document.createElement("div");
    optionElement.classList.add("option");
    const optionName = document.createElement("div");
    optionName.classList.add("option-name");
    renderLatex([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"][index], optionName);
    optionElement.appendChild(optionName);
    const optionValue = document.createElement("div");
    optionValue.classList.add("option-value");
    renderLatex(option, optionValue);
    optionElement.appendChild(optionValue);
    questionOptions.appendChild(optionElement);
    if (option === answer) correctOption = optionName;
    optionNames.push(optionName);

    optionElement.addEventListener("click", () => {
        if (over) return;
        over = true;
        clearTimeouts();
        const classes = optionName.classList;
        if (classes.contains("wrong") || classes.contains("correct")) return;
        classes.add("wrong");
        correctOption.classList.add("correct");
        if (option === answer) {
            addPoints(10 + (time - (Date.now() - startTime) / 1000));
            newQuestion();
        } else {
            addPoints(-10);
            setSafeTimeout(newQuestion, 2000);
        }
    });
}

function showQuestion({question, answer, options}) {
    clearTimeouts();

    over = false;
    optionNames = [];
    questionContainer.style.scale = "1";
    renderLatex((isMobileViewport() ? "\\Large " : "\\huge ") + question, questionLabel);
    questionOptions.innerHTML = "";

    let time = 10;
    if (points > 100) time = 7;
    if (points > 250) time = 6;
    if (points > 500) time = 4;
    if (points > 700) time = 3;
    timeBar.hidden = false;
    timeBar.style.animationDuration = time + "s";

    for (let i = 0; i < options.length; i++) {
        makeOptionDiv(options[i], i, answer, time);
    }

    setSafeTimeout(() => {
        if (over) return;

        for (const name of optionNames) {
            name.classList.add("wrong");
        }

        addPoints(-2);
        pointsText.textContent = Math.floor(points).toString();
        correctOption.classList.add("correct");
        over = true;
        setSafeTimeout(newQuestion, 2000);
    }, time * 1000);
}

pressToStart.addEventListener("click", () => {
    addPoints(0);
    pressToStart.style.scale = "0";
    endButton.style.scale = "1";
    pointsText.style.scale = "1";
    newQuestion();
});

endButton.addEventListener("click", () => {
    points = 0;
    addPoints(0);
    over = false;
    clearTimeouts();
    questionContainer.style.scale = "0";
    pressToStart.style.scale = "1";
    endButton.style.scale = "0";
    pointsText.style.scale = "0";
});