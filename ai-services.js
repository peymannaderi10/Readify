// Readify Extension - AI Services
// Handles AI-powered text summarization and processing

async function summarizeText(text, option) {
    var requestText = "";
    const encodedApiKey = "ENTER API KEY HERE";
    const decodedApiKey = atob(encodedApiKey);
    
    switch (option) {
        case "summary":
            requestText =
                "Please summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key take aways in clear and concise bullet points.: " +
                text;
            break;
        case "shortSummary":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be a short summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly the initial summary should be written in 1-3 sentences.: " +
                text;
            break;
        case "longSummary":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be a long summary of the paragraph that is very detailed while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly the initial summary should be written in 3-5 sentences.: " +
                text;
            break;
        case "formalTone":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in a formal tone: " +
                text;
            break;
        case "casualTone":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in a casual tone :" +
                text;
            break;
        case "neutralTone":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in a neutral tone: " +
                text;
            break;
        case "spanish":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Spanish Language: " +
                text;
            break;
        case "french":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the French Language: " +
                text;
            break;
        case "mandarin":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Mandarin Language: " +
                text;
            break;
        case "cantonese":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Cantonese Language: " +
                text;
            break;
        case "korean":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Korean Language: " +
                text;
            break;
        case "japanese":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Japanese Language: " +
                text;
            break;
        case "vietnamese":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Vietnamese Language: " +
                text;
            break;
        case "punjabi":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Punjabi Language: " +
                text;
            break;
        case "arabic":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Arabic Language: " +
                text;
            break;
        case "indonesian":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Indonesian Language: " +
                text;
            break;
        case "turkish":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Turkish Language: " +
                text;
            break;
        case "russian":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Russian Language: " +
                text;
            break;
        case "german":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the German Language:: " +
                text;
            break;
        case "tagalog":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Tagalog Language: " +
                text;
            break;
        case "italian":
            requestText =
                "Please Summarize the following text (in paragraph format) and sum up the paragraph without losing any of its meaning. The result should be  a summary of the paragraph that is as short as possible while still keeping all of the original meaning and context. Also, be sure to add key takeaways in clear and concise bullet points. Lastly, the entire output should be in the Italian Language: " +
                text;
            break;
    }

    const data = JSON.stringify([
        {
            content: 'Hello! I\'m an AI assistant bot based on ChatGPT 3. How may I help you?',
            role: 'system'
        },
        {
            content: requestText,
            role: 'user'
        }
    ]);

    // Function to delay execution for a set amount of time
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    // Function to make the API call
    const makeRequest = async () => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            xhr.addEventListener("readystatechange", function () {
                if (this.readyState === this.DONE) {
                    try {
                        const response = JSON.parse(this.responseText);
                        if (response.text !== null) {
                            resolve(response.text);
                        } else {
                            throw new Error('Response text is null');
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            });

            xhr.open("POST", "https://chatgpt-api8.p.rapidapi.com/");
            xhr.setRequestHeader("content-type", "application/json; charset=UTF-8");
            xhr.setRequestHeader("X-RapidAPI-Key", decodedApiKey);
            xhr.setRequestHeader("X-RapidAPI-Host", "chatgpt-api8.p.rapidapi.com");

            xhr.send(data);
        });
    };

    // Function to retry the request until the text is not null
    const retryRequest = async (retries, interval) => {
        for (let i = 0; i < retries; i += 1) {
            try {
                return await makeRequest();
            } catch (error) {
                if (i === retries - 1) {
                    return "Sorry we're a bit busy, please try again later.";
                }
                await delay(interval);
            }
        }
    };

    return retryRequest(8, 2000);
} 