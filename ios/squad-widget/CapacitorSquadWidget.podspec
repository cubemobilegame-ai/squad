require 'json'
package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
Pod::Spec.new do |s|
  s.name = 'CapacitorSquadWidget'
  s.version = package['version']
  s.summary = package['description']
  s.license = 'MIT'
  s.homepage = 'https://squad-64cd5.web.app'
  s.author = 'Cube Mobile Apps'
  s.source = { :git => 'https://github.com/cubemobilegame-ai/squad.git', :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
