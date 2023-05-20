#include <Arduino.h>

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <driver/ledc.h>

#define LED_PIN 2   // GPIO pin connected to the LED
#define PIN_A 12    // GPIO pin connected to the LED
#define PIN_B 13    // GPIO pin connected to the LED
#define PMW_LED 0   // GPIO pin connected to the LED
#define PMW_A 1     // GPIO pin connected to the LED
#define PMW_B 2     // GPIO pin connected to the LED
#define PMW_HZ 1000 // GPIO pin connected to the LED

BLEServer *pServer = NULL;
BLECharacteristic *pCharacteristic = NULL;
#define SERVICE_UUID "dc05a09d-4d38-4ea9-af54-1add36c9a987"
#define CHARACTERISTIC_UUID "c460751e-342b-4700-96ce-190ac0ac526e"

class MyServerCallbacks : public BLEServerCallbacks
{
  void onConnect(BLEServer *pServer)
  {
    // Nothing to do here
  }

  void onDisconnect(BLEServer *pServer)
  {
    delay(500);                  // give the bluetooth stack the chance to get things ready
    pServer->startAdvertising(); // restart advertising
    // Nothing to do here
  }
};

class MyCallbacks : public BLECharacteristicCallbacks
{
  void onWrite(BLECharacteristic *pCharacteristic)
  {
    std::string value = pCharacteristic->getValue();
    ledcWrite(PMW_LED, value[0]);

    int speedA = 0;
    int speedB = 0;
    //Forward vs reverse
    if (value[1] == 1)
      speedA = value[0];
    else
      speedB = value[0];

    ledcWrite(PMW_A, speedA);
    ledcWrite(PMW_B, speedB);
  }
};

void setup()
{
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIN_A, OUTPUT);
  pinMode(PIN_B, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Initially turn off the LED
  digitalWrite(PIN_A, LOW);   // Initially turn off the LED
  digitalWrite(PIN_B, LOW);   // Initially turn off the LED

  ledcSetup(PMW_LED, PMW_HZ, 8); // Configure PWM channel 0
  ledcSetup(PMW_A, PMW_HZ, 8);   // Configure PWM channel 0
  ledcSetup(PMW_B, PMW_HZ, 8);   // Configure PWM channel 0
  ledcAttachPin(LED_PIN, PMW_LED);
  ledcAttachPin(PIN_A, PMW_A);
  ledcAttachPin(PIN_B, PMW_B);

  BLEDevice::init("Tiller Pilot"); // Set the name of your ESP32 device

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID); // Use the Battery Service UUID

  pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID, BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE);
  pCharacteristic->setCallbacks(new MyCallbacks());

  pCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  BLEAdvertising *pAdvertising = pServer->getAdvertising();
  pAdvertising->start();
}

void loop()
{
  // Nothing to do here
}
