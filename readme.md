# Cat Food Weight Monitoring System

This project implements a system for monitoring cat food weight and predicting the food added to the bowl. It consists of four main Docker containers:

*   **Frontend:** Provides the user interface for displaying data and interacting with the system.
*   **Backend (API):** Serves as the API gateway for the frontend, handling data requests and passing them to the data generator and model services. It also the entry point for data from the iot device to be put in the database.
*   **Data Generator:** Retrieves a specific portion of data from a CSV file to display on the frontend.
*   **Model:** Hosts the deep learning model used for predicting when the chart is displayed

## Architecture

The system follows a microservices architecture, with each component running in its own Docker container. The frontend communicates with the backend API, which in turn communicates with the data generator and model services.

**predictions** the predictions are currently not accurate, it will display 0 in the website because the value gets rounded, the model will output 0.01 or something along the lines. 
I have created a new deep learning lstm which worked well in my yupiter notebook, but doesnt work as expected with the data from the website. It does the prediction as it is supposed to be, the output is just off. I will include the new yupiter notebook in my zip file. 

I have disabled the show today and show yesterday buttons. This is because you dont have the scale connected to it, so the data wont be up to date and you wont see anything. That's also why I included the data-generator. 

**Usage**
Compose the yaml file to generate the docker containers. When this is done you can find the websote at localhost port 80. To see the api go to <a>http://localhost:6969/docs</a>.


