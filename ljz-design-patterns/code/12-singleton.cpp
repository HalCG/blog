// g++ -std=c++17 -o demo 12-singleton.cpp
#include <iostream>
#include <map>
#include <string>

class Config {
public:
  static Config& instance() {
    static Config inst;
    return inst;
  }
  void set(const std::string& k, std::string v) { data_[k] = std::move(v); }
  std::string get(const std::string& k) const {
    auto it = data_.find(k);
    return it == data_.end() ? "" : it->second;
  }
  Config(const Config&) = delete;
  Config& operator=(const Config&) = delete;

private:
  Config() = default;
  std::map<std::string, std::string> data_;
};

int main() {
  Config::instance().set("host", "127.0.0.1");
  std::cout << Config::instance().get("host") << "\n";
  return 0;
}
