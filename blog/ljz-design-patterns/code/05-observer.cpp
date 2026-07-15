// g++ -std=c++17 -o demo 05-observer.cpp
#include <algorithm>
#include <iostream>
#include <vector>

class Observer {
public:
  virtual void update(double price) = 0;
  virtual ~Observer() = default;
};

class Stock {
  double price_ = 0;
  std::vector<Observer*> observers_;
public:
  void attach(Observer* o) { observers_.push_back(o); }
  void detach(Observer* o) {
    observers_.erase(
      std::remove(observers_.begin(), observers_.end(), o),
      observers_.end());
  }
  void setPrice(double p) {
    price_ = p;
    for (auto* o : observers_) o->update(price_);
  }
};

class Display : public Observer {
  std::string name_;
public:
  explicit Display(std::string n) : name_(std::move(n)) {}
  void update(double price) override {
    std::cout << name_ << ": " << price << "\n";
  }
};

int main() {
  Stock stock;
  Display d("Screen");
  stock.attach(&d);
  stock.setPrice(10.5);
  return 0;
}
