// g++ -std=c++17 -o demo 11-builder.cpp
#include <iostream>
#include <string>

class Pizza {
public:
  std::string dough, sauce, topping;
  void describe() const {
    std::cout << dough << " + " << sauce << " + " << topping << "\n";
  }
};

class PizzaBuilder {
public:
  virtual void buildDough(const std::string& d) = 0;
  virtual void buildSauce(const std::string& s) = 0;
  virtual void buildTopping(const std::string& t) = 0;
  virtual Pizza getResult() = 0;
  virtual ~PizzaBuilder() = default;
};

class MargheritaBuilder : public PizzaBuilder {
  Pizza pizza_;
public:
  void buildDough(const std::string& d) override { pizza_.dough = d; }
  void buildSauce(const std::string& s) override { pizza_.sauce = s; }
  void buildTopping(const std::string& t) override { pizza_.topping = t; }
  Pizza getResult() override { return pizza_; }
};

int main() {
  MargheritaBuilder builder;
  builder.buildDough("thin");
  builder.buildSauce("tomato");
  builder.buildTopping("cheese");
  builder.getResult().describe();
  return 0;
}
