# SCE-TakeHome

### Run Code 
-To run code, use node finance.js in terminal (make sure npm is installed)\
-Then, put in parameters, one example being:\
curl -X POST http://localhost:3000/start-monitoring \
-H "Content-Type: application/json" \
-d '{"symbol":"AAPL","minutes":0,"seconds":10}'\
which uses AAPL data and refreshes it every 10 seconds (time can be changed)
